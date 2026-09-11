/* =========================================================================
   WAY — 78_amis.js — ce que l'établi « Amis » écrit et lit (chantier 8)
   Trois outils sans DOM, utilisables aussi depuis node (tests, conversion) :
   - Amis.serialize : un littéral JS écrit comme Prettier l'écrirait (printWidth 140, guillemets simples,
     virgules es5), pour que content5.js exporté soit un point fixe de `prettier --write` ;
   - Amis.snippet : le texte complet de dev/content5.js à partir des amis, images comprises ;
   - Amis.pngRaw / pngAssemble / encodeCanvas : un PNG palette (PLTE + tRNS, ≤ 256 couleurs) là où le canvas ne
     sait produire que du RGBA — trois fois plus léger pour du pixel art, sans perdre un pixel.
   ========================================================================= */

'use strict';
const Amis = (() => {
  const WIDTH = 140;
  const IDENT = /^[A-Za-z_$][\w$]*$/;
  /* ---- littéraux : chaînes, nombres, clés ---- */
  function str(s) {
    /* Prettier : guillemets simples, sauf si la chaîne contient plus de simples que de doubles */
    const simples = (s.match(/'/g) || []).length,
      doubles = (s.match(/"/g) || []).length;
    const q = simples > doubles ? '"' : "'";
    let out = '';
    for (const ch of s) {
      if (ch === '\\') out += '\\\\';
      else if (ch === q) out += '\\' + q;
      else if (ch === '\n') out += '\\n';
      else out += ch;
    }
    return q + out + q;
  }
  const key = k => (IDENT.test(k) ? k : str(k));
  /* ---- l'écriture : chaque valeur essaie d'abord de tenir sur une ligne ---- */
  function inline(v) {
    if (v === null) return 'null';
    if (Array.isArray(v)) return v.length ? '[' + v.map(inline).join(', ') + ']' : '[]';
    if (typeof v === 'object') {
      const ks = Object.keys(v);
      return ks.length ? '{ ' + ks.map(k => key(k) + ': ' + inline(v[k])).join(', ') + ' }' : '{}';
    }
    if (typeof v === 'string') return str(v);
    if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'null';
    if (typeof v === 'boolean') return String(v);
    return 'null';
  }
  /* Prettier casse un tableau de plus d'un objet (ou de plus d'un tableau) élément par élément, même s'il tiendrait */
  const concis = a => a.length < 2 || !a.every(x => x && typeof x === 'object');
  /* `indent` : retrait du bloc courant (2 espaces par niveau, comme Prettier) ; `used` : ce que la ligne porte
     déjà autour de la valeur (la clé avant, la virgule après), pour juger si elle tient dans les 140 colonnes */
  function serialize(v, indent = 0, used = 0) {
    const one = inline(v);
    if (v === null || typeof v !== 'object' || !Object.keys(v).length) return one;
    if (indent + used + one.length <= WIDTH && (!Array.isArray(v) || concis(v))) return one;
    const pad = ' '.repeat(indent + 2),
      end = ' '.repeat(indent);
    if (Array.isArray(v)) return '[\n' + v.map(x => pad + serialize(x, indent + 2, 1) + ',').join('\n') + '\n' + end + ']';
    return (
      '{\n' +
      Object.keys(v)
        .map(k => pad + key(k) + ': ' + serialize(v[k], indent + 2, key(k).length + 3) + ',')
        .join('\n') +
      '\n' +
      end +
      '}'
    );
  }

  /* ---- content5.js ---- */
  const HEADER = `/* =========================================================================
   WAY — content5.js — LES AMIS
   Contenu créé dans l'atelier « Amis » (F2, quatrième établi) : les animaux de compagnie de ceux avec qui on
   joue, et leurs visages comme personnages. Ce fichier est ÉCRIT par le bouton « Exporter » de cet établi, qui
   relit d'abord ce qu'il contient (les amis livrés y restent, les changements locaux s'y fondent) — ne pas
   l'écrire à la main : recoller le texte tel quel puis relancer \`node dev/build.js\`.

   Les images sont embarquées en clair (data URI, PNG palette pour les planches, JPEG pour les photos) : rien à
   déposer dans assets/, le dépôt se suffit à lui-même et le jeu partagé marche chez tout le monde sans fichier
   annexe. Elles sont enregistrées une fois au démarrage par Sprites.loadFriends().
   ========================================================================= */

`;
  /* `data` : { images: {nom: dataURL}, sheets: {nom: {fw, url}}, characters: [], pets: [], pairs: [] } */
  function snippet(data, opts = {}) {
    const imgs = opts.photos === false ? {} : data.images || {};
    let out = HEADER + '/* AMIS_DEBUT */\n';
    if (opts.photos === false) out += "/* photos non exportées : accord non donné (voir l'établi Amis) */\n";
    const ik = Object.keys(imgs);
    out += ik.length
      ? 'const FRIEND_IMAGES = {\n' + ik.map(k => `  ${key(k)}: ${str(imgs[k])},`).join('\n') + '\n};\n'
      : 'const FRIEND_IMAGES = {};\n';
    const sk = Object.keys(data.sheets || {});
    out += sk.length
      ? 'const FRIEND_SHEETS = {\n' +
        sk.map(k => `  ${key(k)}: {\n    fw: ${data.sheets[k].fw},\n    url: ${str(data.sheets[k].url)},\n  },`).join('\n') +
        '\n};\n'
      : 'const FRIEND_SHEETS = {};\n';
    out +=
      'const FRIEND_CONTENT = ' +
      serialize({ characters: data.characters || [], pets: data.pets || [], pairs: data.pairs || [] }, 0, 24) +
      ';\n';
    out += 'CONTENT.characters.push(...FRIEND_CONTENT.characters);\n';
    out += 'CONTENT.pets.push(...FRIEND_CONTENT.pets);\n';
    out += 'CONTENT.pairs.push(...FRIEND_CONTENT.pairs);\n';
    out += '/* AMIS_FIN */\n';
    return out;
  }

  /* ---- PNG palette ----
     Le canvas n'écrit que du RGBA 32 bits. Un PNG palette (type de couleur 3) pèse un octet par pixel avant
     compression, et le pixel art tient dans 256 couleurs : la palette est prise dans l'ordre d'apparition, ce qui
     rend l'encodage déterministe (mêmes pixels → mêmes octets). */
  const CRC = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  /* palette + lignes brutes (filtre 0) ; null au-delà de 256 couleurs */
  function pngRaw(rgba, w, h) {
    const idx = new Map();
    const pal = [];
    const raw = new Uint8Array((w + 1) * h);
    let o = 0;
    for (let y = 0; y < h; y++) {
      raw[o++] = 0;
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const a = rgba[i + 3];
        /* un pixel transparent est toujours le même : sa couleur cachée ne compte pas */
        const k = a === 0 ? 0 : ((rgba[i] << 24) | (rgba[i + 1] << 16) | (rgba[i + 2] << 8) | a) >>> 0;
        let p = idx.get(k);
        if (p === undefined) {
          if (pal.length === 256) return null;
          p = pal.length;
          idx.set(k, p);
          pal.push(a === 0 ? [0, 0, 0, 0] : [rgba[i], rgba[i + 1], rgba[i + 2], a]);
        }
        raw[o++] = p;
      }
    }
    return { pal, raw };
  }
  function chunk(type, data) {
    const out = new Uint8Array(12 + data.length);
    const dv = new DataView(out.buffer);
    dv.setUint32(0, data.length);
    for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
    out.set(data, 8);
    dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
    return out;
  }
  /* assemble le fichier à partir des lignes déjà compressées (zlib) */
  function pngAssemble(w, h, pal, deflated) {
    const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const ihdr = new Uint8Array(13);
    const dv = new DataView(ihdr.buffer);
    dv.setUint32(0, w);
    dv.setUint32(4, h);
    ihdr[8] = 8; // 8 bits par indice
    ihdr[9] = 3; // palette
    const plte = new Uint8Array(pal.length * 3);
    const trns = new Uint8Array(pal.length);
    let opaque = true;
    pal.forEach((c, i) => {
      plte[i * 3] = c[0];
      plte[i * 3 + 1] = c[1];
      plte[i * 3 + 2] = c[2];
      trns[i] = c[3];
      if (c[3] !== 255) opaque = false;
    });
    const parts = [sig, chunk('IHDR', ihdr), chunk('PLTE', plte)];
    if (!opaque) parts.push(chunk('tRNS', trns));
    parts.push(chunk('IDAT', deflated), chunk('IEND', new Uint8Array(0)));
    const n = parts.reduce((s, p) => s + p.length, 0);
    const out = new Uint8Array(n);
    let o = 0;
    for (const p of parts) {
      out.set(p, o);
      o += p.length;
    }
    return out;
  }
  function toBase64(bytes) {
    if (typeof Buffer !== 'undefined' && Buffer.from) return Buffer.from(bytes).toString('base64');
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }
  /* navigateur : compression par CompressionStream('deflate') (format zlib, ce que l'IDAT attend) */
  async function deflateBrowser(bytes) {
    const cs = new CompressionStream('deflate');
    const w = cs.writable.getWriter();
    w.write(bytes);
    w.close();
    const buf = await new Response(cs.readable).arrayBuffer();
    return new Uint8Array(buf);
  }
  /* un canvas → data URL PNG palette si ≤ 256 couleurs, sinon le PNG RGBA du canvas */
  async function encodeCanvas(c) {
    const g = c.getContext('2d');
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const r = pngRaw(d, c.width, c.height);
    if (!r || typeof CompressionStream !== 'function') return c.toDataURL('image/png');
    const z = await deflateBrowser(r.raw);
    return 'data:image/png;base64,' + toBase64(pngAssemble(c.width, c.height, r.pal, z));
  }
  return { serialize, inline, str, snippet, HEADER, pngRaw, pngAssemble, encodeCanvas, toBase64, crc32 };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = Amis;
