# SALLE ZÉRO — CONTENT.md (phase 1, biome 1)

> Livrable de l'Agent Design de contenu. Ce document est la version lisible de `dev/content.js` ; les tableaux ci-dessous sont **générés depuis ce fichier**, qui fait foi. Toutes les valeurs respectent `SCHEMA.md` (stats, hooks, effets), sauf les 3 effets `NEW:` documentés en §12.

Repères : PV joueur 100, vitesse 260 px/s, tuile 48 px, salle 24×13 tuiles (x 0..23, y 0..12), entrée à gauche (x=0, y=6), sortie à droite (x=23, y=6). DPS cible arme nue : 40-70.

Volumes : characters 2 · weapons 8 · skills 8 · upgrades 51 · metaPassives 16 · biomes 1 · enemies 7 · bosses 1 · traps 8 · rooms 9.

## 1. Personnages

| id | Nom | PV | Vitesse | Dégâts | Chance | Arme de départ | Débloqué | Prix |
|---|---|---|---|---|---|---|---|---|
| `char_neuf` | Neuf (Sujet 09) | 100 | 260 | ×1 | 2 | `weapon_blade` | oui | 0 |
| `char_marge` | Marge | 80 | 280 | ×1 | 0 | `weapon_pistol` | non | 400 |

| Personnage | Trait | Effet | mods | hooks |
|---|---|---|---|---|
| Neuf (Sujet 09) | **Tolérance tissulaire** | Les greffes prennent mieux : +20 % XP, +2 chance. Cicatrise 10 % des PV max à chaque nouvelle salle. | xpGain ×1.2, luck +2 | onRoomStart:heal_on_room (fraction=0.1) |
| Marge | **Connaissance du Site** | Pièges : -50 % dégâts subis. Fragments d'énergie doublés. +20 % vitesse pendant 2 s quand un piège vous touche. | trapDamageMul ×0.5 | passive:fragments_double; onTrapDamage:speed_burst (speedMul=1.2 duration=2) |

Neuf (LORE §6, *Tolérance tissulaire*) : le personnage "école", 100 PV ; il monte de niveau 20 % plus vite et voit plus d'épiques : c'est le personnage qui **collectionne les greffes**. Marge (LORE §6, *Connaissance du Site*) : 80 PV mais les pièges ne lui font que la moitié, les fragments sont doublés et un piège qui la touche l'accélère : les salles de pièges deviennent son terrain, et *Sol instable* (×2) redevient un simple ×1 pour elle. Pistolet de départ pour rester à distance avec moins de PV.

## 2. Armes

| id | Nom | Famille | Type | Dégâts | Cadence /s | Portée px | Vit. proj. | Proj. | Perfo | Rebond | Recul | Taille | Charge | Particularité | DPS nu | Prix |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `weapon_blade` | Lame d'essai | blade | melee | 18 | 3 | 70 | — | 0 | 0 | 0 | ×1 | 60 | — | sweep arc=2.18 hitAllInArc=true | 54 | débloquée |
| `weapon_hammer` | Masse de pression | hammer | area | 60 | 0.8 | 95 | — | 0 | 0 | 0 | ×2.5 | 85 | — | slam stunTime=0.4 windup=0.25 | 48 / cible (zone) | 150 |
| `weapon_bow` | Arc tendeur | bow | ranged | 30 | 1.6 | 720 | 900 | 1 | 1 | 0 | ×1.2 | 6 | 0.25-1 s ×3 | — chargedPierceBonus=2 chargedProjSpeedMul=1.4 | 48 spam · 72 chargé | 200 |
| `weapon_pistol` | Pistolet à ricochet | pistol | ranged | 14 | 4 | 620 | 760 | 1 | 0 | 2 | ×0.8 | 5 | — | ricochet seekRadius=220 seekOnBounce=true | 56 | débloquée |
| `weapon_boomerang` | Boomerang de rappel | boomerang | ranged | 22 | 1.4 | 380 | 620 | 1 | 99 | 0 | ×1 | 12 | — | return passes=2 maxInFlight=1 returnSpeedMul=1.15 | 62 (2 passages) | 220 |
| `weapon_orb` | Orbe orbitale | orb | orbital | 12 | 4 | 90 | — | 2 | 99 | 0 | ×0.6 | 14 | — | orbit radius=90 angularSpeed=4.5 tickRate=4 blocksProjectiles=false | 48 / orbe (contact) | 250 |
| `weapon_chain` | Arc voltaïque | chain | ranged | 24 | 2 | 420 | 1400 | 1 | 0 | 0 | ×0.5 | 6 | — | chain jumps=2 radius=160 damageMul=0.6 | 48 solo · ~105 sur 3 | 300 |
| `weapon_flame` | Brûleur court | flame | area | 6 | 10 | 170 | — | 0 | 99 | 0 | ×0.3 | 170 | — | cone angle=0.7 burnDps=4 burnDuration=2 | 60 + brûlure 4/s | 280 |

Profils : Lame = sûr/soutenu sans portée ; Masse = burst lent, zone, étourdit (risqué au corps à corps) ; Arc = burst à charge, récompense la précision ; Pistolet = soutenu sûr, dégâts indirects par ricochet ; Boomerang = fenêtre de vulnérabilité pendant le retour, mais 2 passages ; Orbe = zéro visée, exige de coller les ennemis ; Foudre = faible en duel, très fort en groupe ; Brûleur = DPS max mais portée 170 px, il faut se coller.

Notes moteur : `weapon_bow.special` porte les bonus de charge (`chargedPierceBonus`, `chargedProjSpeedMul`) ; `weapon_boomerang.special.maxInFlight` limite à 1 boomerang en vol (2 avec la synergie *Triple rappel* via `projectiles`) ; `weapon_orb.projectiles` = nombre d'orbes ; `weapon_flame.fireRate` = ticks/s du cône.

## 3. Compétences actives

| id | Nom | Cooldown | Durée | kind | Paramètres | Description |
|---|---|---|---|---|---|---|
| `skill_dash` | Dash | 6 s | 0.2 s | dash | distance=220, invulnerable=true | Ruée de 220 px, invulnérable pendant 0,2 s. Cooldown 6 s. |
| `skill_shield` | Bouclier | 14 s | 4 s | shield | amount=40 | Bouclier de 40 PV gris pendant 4 s. Cooldown 14 s. |
| `skill_shockwave` | Onde de choc | 10 s | 0.3 s | shockwave | radius=180, damage=45, knockback=2.5 | Repousse et inflige 45 dégâts dans 180 px. Cooldown 10 s. |
| `skill_slowtime` | Dilatation | 20 s | 3 s | slowtime | scale=0.35, playerScale=1 | Le monde ralentit à 35 % pendant 3 s, pas vous. Cooldown 20 s. |
| `skill_turret` | Tourelle | 16 s | 8 s | turret | damage=10, fireRate=3, range=360, hp=60 | Tourelle 60 PV, 10 dégâts ×3/s, portée 360 px, 8 s. Cooldown 16 s. |
| `skill_blink` | Saut de phase | 8 s | 0 s | blink | distance=260, invulnerable=0.15, ignoreObstacles=true | Téléportation de 260 px vers le curseur, 0,15 s invulnérable. CD 8 s. |
| `skill_magnet` | Aimant | 12 s | 2 s | magnet | radius=1400, pullSpeed=900 | Attire tous les pickups de la salle pendant 2 s. Cooldown 12 s. |
| `skill_overdrive` | Surrégime | 18 s | 5 s | overdrive | damageMul=1.5, fireRateMul=1.5, selfDamagePerSec=2 | +50 % dégâts et cadence 5 s, mais 2 PV/s perdus. Cooldown 18 s. |

Le dash est une compétence : un joueur sans *Dash* ni *Saut de phase* n'a aucun déplacement d'urgence et doit compter sur les obstacles et la lecture des télégraphies. *Surrégime* est le 8e choix (préféré à decoy : plus lisible à équilibrer, et il crée un dilemme PV/DPS).

## 4. Greffes (61)

Répartition : Commune 18 · Rare 22 · Épique 15 · Colossale 6. Reprendre une greffe qu'on a déjà = son palier suivant (« Paliers » = nombre de fois qu'on peut la prendre) : les effets à chance (brûlure, gel, poison, chaîne, butin) multiplient leur chance par le palier. Chantier 6 : 74 → 61, une seule greffe par effet, les anciens ids se résolvent par `Content.upgrade` (`UPGRADE_ALIASES`), `node dev/check-greffes.js` vérifie qu'aucune n'en domine une autre de la même rareté. Chantier I-2 : descriptions au tutoiement, sans anglicisme ni pixel, ≤ 90 caractères, catégories affichées en français (`CATEGORIES` dans 50_ui.js).

### 4.1 Communes

| id | Nom | Catégorie | Famille | Paliers | Description | mods | hooks |
|---|---|---|---|---|---|---|---|
| `upg_tranchant` | Tranchant | Attaque | — | 5 | +10 % dégâts. | damage ×1.1 | — |
| `upg_gachette` | Gâchette | Attaque | — | 4 | +8 % cadence d'attaque. | fireRate ×1.08 | — |
| `upg_oeil_vif` | Œil vif | Attaque | — | 5 | +6 % chance de critique. | critChance +0.06 | — |
| `upg_coup_critique` | Coup critique | Attaque | — | 3 | +40 % dégâts des critiques (×1,5 → ×1,9). | critMult +0.4 | — |
| `upg_longue_portee` | Longue portée | Attaque | — | 3 | +15 % portée, projectiles 15 % plus rapides. | range ×1.15, projSpeed ×1.15 | — |
| `upg_plaque` | Plaque | Défense | — | 5 | +20 PV max. | maxHp +20 | — |
| `upg_peau_dure` | Peau dure | Défense | — | 4 | +1 armure (dégâts plats retirés par coup). | armor +1 | — |
| `upg_cicatrisation` | Cicatrisation | Défense | — | 4 | +0,8 PV/s de régénération. | regen +0.8 | — |
| `upg_reflexes` | Réflexes | Défense | — | 4 | +5 % d'esquive. | dodge +0.05 | — |
| `upg_semelles` | Semelles | Mobilité | — | 4 | +10 % vitesse de déplacement. | speed ×1.1 | — |
| `upg_recuperation` | Récupération | Mobilité | — | 4 | −6 % de recharge de compétence. | cooldownReduction +0.06 | — |
| `upg_tirelire` | Tirelire | Butin | — | 4 | +20 % de pièces, et tu ramasses un peu plus loin. | coinGain ×1.2, pickupRadius +30 | — |
| `upg_apprentissage` | Apprentissage | Butin | — | 4 | +15 % XP gagnée. | xpGain ×1.15 | — |
| `upg_trefle` | Trèfle | Butin | — | 4 | +2 chance (raretés décalées vers épique/colossal). | luck +2 | — |
| `upg_butin` | Butin | Butin | — | 3 | 15 % de chance qu'un ennemi tué lâche une pièce en plus. | — | onKill:coin_on_kill (chance=0.15 amount=1) |
| `upg_etincelle` | Étincelle | Spécial | — | 3 | 15 % de chance de brûler (5 dégâts/s, 2 s) — 30 % puis 45 % en la reprenant. | — | onHit:burn (chance=0.15 dps=5 duration=2) |
| `upg_givre` | Givre | Spécial | — | 3 | 12 % de chance de geler : -50 % vitesse pendant 1,2 s. | — | onHit:freeze (chance=0.12 duration=1.2 slow=0.5) |
| `upg_toxine` | Toxine | Spécial | — | 3 | 15 % de chance d'empoisonner : 3 dégâts/s, 4 s, cumulable ×3. | — | onHit:poison (chance=0.15 dps=3 duration=4 stacks=3) |

### 4.2 Rares

| id | Nom | Catégorie | Famille | Paliers | Description | mods | hooks |
|---|---|---|---|---|---|---|---|
| `upg_frappe_lourde` | Frappe lourde | Attaque | — | 3 | +22 % dégâts, +15 % zone, +20 % recul, -8 % cadence. | damage ×1.22, fireRate ×0.92, areaSize ×1.15, knockback ×1.2 | — |
| `upg_perforation` | Perforation | Attaque | — | 3 | +1 ennemi traversé par les tirs. | pierce +1 | — |
| `upg_rebond` | Rebond | Attaque | — | 3 | +1 rebond sur les murs. | bounce +1 | — |
| `upg_vampirisme` | Vampirisme | Défense | — | 3 | 4 % des dégâts infligés rendus en PV. | lifesteal +0.04 | — |
| `upg_epines` | Épines | Défense | — | 3 | Renvoie 8 dégâts à tout ennemi qui te touche. | thorns +8 | — |
| `upg_isolant` | Isolant | Défense | — | 2 | -40 % dégâts subis des pièges. | trapDamageMul ×0.6 | — |
| `upg_convalescence` | Convalescence | Défense | — | 2 | Au début de chaque salle : +20 % PV et 15 PV de bouclier. | — | onRoomStart:heal_on_room (fraction=0.2); onRoomStart:shield_on_room (amount=15) |
| `upg_adrenaline` | Adrénaline | Mobilité | — | 2 | Chaque ennemi tué : +20 % de vitesse pendant 2 s. | — | onKill:kill_speed (speedMul=1.2 duration=2) |
| `upg_enchainement` | Enchaînement | Mobilité | — | 2 | Chaque ennemi tué : 20 % de chance de réduire la recharge restante de moitié. | — | onKill:skill_reset_on_kill (chance=0.2 fraction=0.5) |
| `upg_chaine_eclair` | Chaîne éclair | Spécial | — | 3 | 20 % de chance de sauter sur 2 ennemis proches (50 %) ; 40 puis 60 % en la reprenant. | — | onHit:chain (chance=0.2 jumps=2 radius=150 damageMul=0.5) |
| `upg_detonation` | Détonation | Spécial | — | 2 | Les ennemis tués explosent : 60 % de tes dégâts, à bout portant. | — | onKill:explode (radius=70 damageMul=0.6) |
| `upg_syn_lame_dansante` | Lame dansante | Synergie | lame | 2 | Lame : +25 % de cadence, et chaque ennemi tué te donne +15 % de vitesse 1,5 s. | fireRate ×1.25 | onKill:kill_speed (speedMul=1.15 duration=1.5) |
| `upg_syn_balles_chercheuses` | Balles chercheuses | Synergie | pistolet | 2 | Pistolet : +2 rebonds, +10 % dégâts. | bounce +2, damage ×1.1 | — |
| `upg_syn_corde_tendue` | Corde tendue | Synergie | arc | 2 | Arc : charge 40 % plus vite, +2 perforation, +30 % vitesse de flèche. | pierce +2, projSpeed ×1.3 | passive:charge_speed (mul=1.4) |
| `upg_syn_combustion` | Combustion | Synergie | flamme | 2 | Flammes : brûlure garantie 8 dégâts/s 3 s, +20 % taille de cône. | areaSize ×1.2 | onHit:burn (chance=1 dps=8 duration=3) |
| `upg_second_canon` | Double canon | Attaque | — | 2 | +1 projectile par tir, -12 % dégâts. | projectiles +1, damage ×0.88 | — |
| `upg_tir_arriere` | Tir arrière | Attaque | — | 1 | Chaque tir envoie aussi un projectile derrière toi (50 %). | — | passive:rear_shot (damageMul=0.5) |
| `upg_aura_brulante` | Aura brûlante | Spécial | — | 2 | Les ennemis à bout portant brûlent : 8 dégâts par seconde. | — | passive:burn_aura (radius=90 dps=8) |
| `upg_drone` | Drone d'appoint | Attaque | — | 2 | Un drone te suit et tire deux fois par seconde (6 dégâts). | — | passive:drone (count=1 damage=6 fireRate=2 range=340) |
| `upg_execution` | Exécution | Attaque | — | 1 | Les ennemis (hors boss) sous 15 % de PV meurent au prochain coup. | — | passive:execute (threshold=0.15) |
| `upg_gel_profond` | Gel profond | Spécial | — | 1 | Les ennemis gelés subissent +35 % de dégâts. | — | passive:frost_bonus (mul=1.35) |
| `upg_rafale` | Rafale | Mobilité | — | 1 | Après une compétence : cadence +45 % pendant 3 s. | — | onSkill:fire_frenzy (fireRateMul=1.45 duration=3) |

### 4.3 Épiques

| id | Nom | Catégorie | Famille | Paliers | Description | mods | hooks |
|---|---|---|---|---|---|---|---|
| `upg_amplificateur` | Amplificateur | Mobilité | — | 2 | +30 % d'effet des compétences, −10 % de recharge. | skillPower ×1.3, cooldownReduction +0.1 | — |
| `upg_double_charge` | Double charge | Mobilité | — | 1 | Ta compétence a deux charges. | — | passive:double_skill |
| `upg_crit_explosif` | Crit explosif | Spécial | — | 1 | Les critiques explosent : 80 % des dégâts à bout portant. +5 % de critique. | critChance +0.05 | onHit:crit_explode (radius=60 damageMul=0.8) |
| `upg_orbes_gardiennes` | Orbes gardiennes | Défense | — | 2 | Deux orbes (10 dégâts) tournent autour de toi et bloquent les tirs ; 4 en la reprenant. | — | passive:orbit_shield (count=2 damage=10 radius=70) |
| `upg_attraction` | Attraction | Butin | — | 1 | Tout ce qui traîne vient à toi. Fragments doublés. +20 % XP. | xpGain ×1.2 | passive:xp_magnet; passive:fragments_double |
| `upg_sang_froid` | Nerfs d'acier | Défense | — | 1 | Touché : ralenti 0,8 s à 40 % et +0,3 s d'invulnérabilité. +2 armure. | invulnTime +0.3, armor +2 | onDamaged:time_slow_on_damage (duration=0.8 scale=0.4) |
| `upg_syn_onde_tellurique` | Onde tellurique | Synergie | masse | 1 | Marteau : +35 % de zone, +20 % de dégâts, les ennemis tués explosent (80 %, de près). | areaSize ×1.35, damage ×1.2 | onKill:explode (radius=90 damageMul=0.8) |
| `upg_syn_constellation` | Constellation | Synergie | orbe | 1 | Orbe : +2 orbes, rayon d'orbite +20 %, +15 % dégâts. | projectiles +2, range ×1.2, damage ×1.15 | — |
| `upg_syn_surtension` | Surtension | Synergie | chaîne | 1 | Foudre : chaque coup saute sur 3 ennemis proches à 70 %. | — | onHit:chain (chance=1 jumps=3 radius=200 damageMul=0.7) |
| `upg_syn_triple_rappel` | Triple rappel | Synergie | boomerang | 1 | Boomerang : +1 boomerang en vol, +15 % dégâts, +15 % cadence. | projectiles +1, damage ×1.15, fireRate ×1.15 | — |
| `upg_salve` | Salve | Attaque | — | 1 | +2 projectiles par tir, -30 % dégâts. | projectiles +2, damage ×0.7 | — |
| `upg_tir_guide` | Tir guidé | Attaque | — | 1 | Tes projectiles se dirigent vers l'ennemi le plus proche. | — | passive:homing (turn=2.5) |
| `upg_eclats` | Éclats | Attaque | — | 1 | Chaque impact libère 2 éclats (40 % des dégâts). | — | onHit:split_on_hit (chance=1 count=2 damageMul=0.4) |
| `upg_balles_explosives` | Balles explosives | Spécial | — | 1 | 25 % de chance qu'un impact explose à bout portant (70 % des dégâts). | — | onHit:hit_explode (chance=0.25 radius=60 damageMul=0.7) |
| `upg_foudre_ambiante` | Foudre ambiante | Spécial | — | 2 | Toutes les 3,5 s environ, la foudre frappe l'ennemi le plus proche (26 dégâts). | — | passive:lightning_storm (every=3.5 damage=26 radius=320) |

### 4.4 Colossales

| id | Nom | Catégorie | Famille | Paliers | Description | mods | hooks |
|---|---|---|---|---|---|---|---|
| `upg_mitraille` | Mitraille | Attaque | — | 1 | +3 projectiles, tirs guidés, -20 % dégâts. | projectiles +3, damage ×0.8 | passive:homing (turn=3) |
| `upg_rappel` | Rappel | Spécial | — | 1 | Tes projectiles reviennent vers toi : un second passage sur tout. | — | passive:projectiles_return |
| `upg_sillage` | Sillage | Mobilité | — | 1 | Chaque ruée laisse une traînée de feu 2,5 s (25 dégâts par seconde). +10 % de vitesse. | speed ×1.1 | onDash:fire_trail (duration=2.5 dps=25) |
| `upg_symbiose` | Symbiose | Défense | — | 1 | Les pièges te soignent au lieu de te blesser. | — | passive:traps_heal (fraction=1) |
| `upg_coeur_de_verre` | Cœur de verre | Attaque | — | 1 | Dégâts ×2, PV max ×0,5. | — | passive:glass_cannon (damageMul=2 hpMul=0.5) |
| `upg_resonance` | Résonance | Spécial | — | 1 | Chaque compétence : une onde de choc de 60 dégâts à mi-salle, et un ralenti de 1,5 s. | — | onSkill:shockwave (radius=200 damage=60 knockback=3); onSkill:bullet_time_skill (duration=1.5 scale=0.3) |

## 5. Améliorations du camp — 16

Économie (chantier 4) : une mort rapporte 30 + 10 par salle plus 10 % par salle des crédits en attente ; une victoire du palier 1 rapporte ~150-250. Coût total pour tout maxer : 3550 crédits. En jeu elles s'appellent **améliorations** (chantier I-2 ; « calibration » ne s'affiche plus nulle part).

| id | Nom | Paliers | Prix | Effet par palier |
|---|---|---|---|---|
| `meta_vitalite` | Vitalité | 4 | 20 / 50 / 90 / 150 | maxHp +10 / maxHp +10 / maxHp +15 / maxHp +15 |
| `meta_puissance` | Puissance | 5 | 30 / 50 / 90 / 130 / 200 | damage ×1.04 / damage ×1.04 / damage ×1.04 / damage ×1.05 / damage ×1.05 |
| `meta_chance` | Chance | 4 | 20 / 40 / 80 / 130 | luck +2 / luck +2 / luck +3 / luck +3 |
| `meta_cupidite` | Cupidité | 4 | 20 / 30 / 70 / 120 | coinGain ×1.1 / coinGain ×1.1 / coinGain ×1.1 / coinGain ×1.15 |
| `meta_etude` | Étude | 4 | 20 / 30 / 70 / 120 | xpGain ×1.08 / xpGain ×1.08 / xpGain ×1.08 / xpGain ×1.1 |
| `meta_reactivite` | Réactivité | 4 | 20 / 50 / 90 / 150 | cooldownReduction +0.05 / cooldownReduction +0.05 / cooldownReduction +0.05 / cooldownReduction +0.05 |
| `meta_resurrection` | Résurrection | 3 | 40 / 100 / 180 | `resurrect` / `resurrect` / `resurrect` |
| `meta_memoire_selective` | Mémoire sélective | 1 | 30 | `selective_memory` |
| `meta_apercu_coffre` | Aperçu du coffre | 1 | 30 | `chest_preview` |
| `meta_quatrieme_choix` | Quatrième choix | 1 | 40 | `fourth_choice` |
| `meta_reroll` | Relance | 3 | 30 / 70 / 140 | `reroll` / `reroll` / `reroll` |
| `meta_celerite` | Célérité | 3 | 20 / 50 / 100 | speed ×1.04 / speed ×1.04 / speed ×1.04 |
| `meta_carapace` | Carapace | 3 | 30 / 70 / 130 | armor +1 / armor +1 / armor +1 |
| `meta_isolation` | Isolation | 3 | 20 / 60 / 110 | trapDamageMul ×0.85 / trapDamageMul ×0.85 / trapDamageMul ×0.85 |
| `meta_aimantation` | Aimantation | 3 | 20 / 30 / 70 | pickupRadius +30 / pickupRadius +30 / pickupRadius +40 |
| `meta_precision` | Précision | 4 | 20 / 50 / 90 / 150 | critChance +0.03 / critChance +0.03 / critChance +0.03 / critChance +0.03 |

Sémantique des `special` : `resurrect` = hook `second_chance` (une fois par partie) ; `selective_memory` = le coffre de la salle 8 ne compte que les 3 meilleures salles pour sa qualité (`Run.chestWindow`) ; `chest_preview` = dans les salles 1 à 3, le HUD affiche la qualité de tirage que le coffre de la salle 4 réserve ; `fourth_choice` = un 4e choix à chaque montée de niveau et à chaque coffre ; `reroll` = compteur de re-rolls par partie (hook `reroll_on_levelup` cumule les paliers : 1/2/3). Chantier 6 : ces trois-là n'ont plus qu'un palier — les paliers 2 et 3 vendaient des effets jamais codés ; la migration v2 → v3 rembourse qui les avait achetés.

## 6. Biome 1 — ADMISSION

Palier -1, Protocole H-9. L'ancien service d'accueil du Site réaménagé en parcours : guichets devenus couverts, bancs devenus obstacles, rails de brancards devenus rails de pièges. Néons qui clignotent, sols humides. Taux de perte : 71 %.

Difficulté : hp ×1, dégâts ×1, vitesse ×1. Mini-boss : `boss_etalon_07`.

| # | Bonus | Effet | Malus | Effet |
|---|---|---|---|---|
| 1 | **Stimulant** | +15 % vitesse de déplacement. (speed ×1.15) | **Sol instable** | Les pièges infligent le double de dégâts. (trapDamageMul ×2) |
| 2 | **Surcharge** | +25 % dégâts. (damage ×1.25) | **Fragile** | -25 % PV max. (maxHp ×0.75) |
| 3 | **Prime d'essai** | +30 % pièces, +20 % XP. (coinGain ×1.3, xpGain ×1.2) | **Protocole d'urgence** | Invulnérabilité après un coup réduite de 0,6 s à 0,3 s. (invulnTime -0.3) |

Le joueur choisit une paire à l'entrée du niveau. Paire 1 favorise les builds mobiles et punit les salles de pièges ; paire 2 est le pari "verre" ; paire 3 paie en méta mais retire la marge d'erreur (0,3 s d'i-frames : un Bloc + une Nuée peuvent enchaîner).

## 7. Ennemis du biome 1

| id | Nom | Archétype | PV | Vitesse | Contact | Rayon | XP | Pièces | Télégraphie | Comportement (params) |
|---|---|---|---|---|---|---|---|---|---|---|
| `enemy_rodeur` | Rôdeur | rusher | 30 | 200 | 10 | 14 | 4 | 1 | 0.35 s #ffd166 | lungeRange=90, lungeWindup=0.35, lungeSpeed=520, lungeDuration=0.25, lungeCooldown=1.2 |
| `enemy_sentinelle` | Sentinelle | shooter | 26 | 130 | 8 | 14 | 6 | 2 | 0.5 s #7bd3ff | fireRate=0.7, projSpeed=320, projDamage=10, projSize=7, keepDistance=300, aimTime=0.5, burst=1 |
| `enemy_bloc` | Bloc | tank | 140 | 90 | 15 | 24 | 14 | 4 | 0.8 s #ff8c42 | chargeWindup=0.8, chargeSpeed=560, chargeDuration=0.7, chargeCooldown=3, stunOnWallHit=1.2, chargeDamageMul=1.5 |
| `enemy_meche` | Mèche | kamikaze | 18 | 240 | 6 | 12 | 5 | 1 | 0.9 s #ff3b3b | fuse=0.9, radius=80, explosionDamage=22, triggerRange=60, explodeOnDeath=true |
| `enemy_incubateur` | Incubateur | summoner | 80 | 60 | 8 | 20 | 20 | 5 | 0.7 s #b98cff | summon=enemy_nuee, every=4, max=4, keepDistance=350, summonWindup=0.7 |
| `enemy_nuee` | Nuée | swarm | 8 | 300 | 5 | 8 | 3 | 1 | 0.2 s #9cff57 | groupSize=5, jitter=40, biteWindup=0.2, biteCooldown=0.8 |
| `enemy_eclipse` | Éclipse | dasher | 40 | 180 | 12 | 14 | 10 | 3 | 0.45 s #ff6bd6 | blinkRange=260, blinkWindup=0.45, blinkCooldown=2.2, dashSpeed=700, dashDuration=0.3, postDashPause=0.6 |

| Nom | Lecture du comportement |
|---|---|
| Rôdeur | Court vers vous ; à 90 px il se fige 0,35 s puis bondit. Le bond peut être esquivé de côté. |
| Sentinelle | Garde 300 px de distance, vise 0,5 s (ligne pointillée) puis tire une balle lente de 10 dégâts. |
| Bloc | Lent et massif. S'arrête, tremble 0,8 s, puis charge en ligne droite. S'il percute un mur : étourdi 1,2 s. |
| Mèche | Fonce sur vous ; à 60 px la mèche s'allume (0,9 s, clignote) puis explose sur 80 px. Tuez-la loin de vous. |
| Incubateur | Reste à 350 px, gonfle 0,7 s puis libère une Nuée (toutes les 4 s, max 4 vivantes). Priorité de tir. |
| Nuée | Groupe de 5 petits organismes rapides et fragiles. Tremblent 0,2 s avant de mordre. Zone et chaîne les balaient. |
| Éclipse | Rôde à 260 px, se dissipe 0,45 s (silhouette) puis réapparaît et fonce sur vous. Vulnérable 0,6 s après la ruée. |

Lisibilité : chaque ennemi a UNE télégraphie (couleur + durée) avant son seul coup dangereux. Le Bloc en charge fait 15 × 1,5 = 22 dégâts : c'est le seul contact > 15, justifié par 0,8 s de préavis. La Nuée vaut 3 XP par unité (15 XP le groupe) car elle n'est dangereuse qu'en enveloppement.

## 8. Mini-boss

**Étalon 07, dit « le Portier »** (`boss_etalon_07`) — Le sujet de référence d'ADMISSION, gardé comme mètre-étalon. Vérin hydraulique au bras droit, prise de calibration à nu dans le dos. Lourd, prévisible : il faut le faire pivoter.

PV 900 (≈ 18 s à 50 DPS, ~35 s réels avec l'esquive), vitesse 120, rayon 36, contact 18, XP 120, pièces 40.

| Phase | Seuil PV | Pattern | Télégraphie | Durée | Cooldown | Paramètres |
|---|---|---|---|---|---|---|
| 1 | < 100 % | ring | 0.8 s | 0.3 s | 3.5 s | count=12, projSpeed=260, projDamage=12, projSize=8 |
| 1 | < 100 % | charge | 0.9 s | 0.8 s | 5 s | speed=620, damage=20, stopOnWall=true, stunTime=1.5 |
| 1 | < 100 % | slam | 1 s | 0.4 s | 6 s | radius=140, damage=25, knockback=3 |
| 2 | < 50 % | fan | 0.6 s | 0.5 s | 2.5 s | count=7, spread=1.2, projSpeed=300, projDamage=12, projSize=8 |
| 2 | < 50 % | spiral | 0.7 s | 3 s | 6 s | arms=2, rate=12, angularSpeed=2, projSpeed=220, projDamage=10, projSize=7 |
| 2 | < 50 % | summon | 0.8 s | 0.5 s | 9 s | enemy=enemy_nuee, count=4 |
| 2 | < 50 % | charge | 0.7 s | 0.8 s | 5 s | speed=700, damage=22, stopOnWall=true, stunTime=1.5 |

**Faiblesse** (`back`, ×2, fenêtre 0.8 s) : Sa prise de calibration dorsale est à nu : tout coup porté dans un cône de 90° derrière lui fait ×2 et le "débranche" 0,8 s (étourdi, ne se retourne pas). Une charge finie dans un mur (1,5 s d'étourdissement) est le moyen le plus sûr d'atteindre son dos.

Télégraphie : ring = la plaque « 07 » s'illumine et le corps pulse ; charge = il s'accroupit, le vérin se rétracte, une ligne rouge montre la trajectoire ; slam = cercle rouge au sol qui se remplit ; fan = éventail de traits ; spiral = rotation lente visible ; summon = quatre œufs verts au sol. Son dos est dessiné avec la prise de calibration qui clignote : la faiblesse est lisible à l'écran.

Exploiter la faiblesse : (a) après une charge dans un mur, il est étourdi 1,5 s face au mur, dos exposé ; (b) pendant un slam ou une salve, contourner un bloc 2×2 de la salle 5 pour passer derrière ; (c) le Saut de phase / Dash traverse sa hitbox. Un coup dans le dos le débranche 0,8 s (pas de retournement), puis 3 s de délai avant un nouveau débranchement (`stunCooldown`) pour éviter le stun-lock.

**Revanche (salle 9, PRÉVU, non implémenté)** : PV ×1.6. PRÉVU (salle 9) : ÉTALON 07 / rév. B, reconditionné entre les salles 5 et 9. 1440 PV. Une plaque de tôle vissée à la va-vite couvre la prise dorsale : la faiblesse est inactive jusqu'à 6 impacts dans le dos, puis la plaque saute et la faiblesse revient avec une fenêtre de 0,4 s au lieu de 0,8. Ses charges ne s'arrêtent plus dans les murs (0,6 s d'étourdissement). Il a chargé vos données de consignation : en phase 2 il reproduit votre compétence de salle 1 (dash → charge courte, tourelle → summon, onde → slam, blink → téléportation dans votre dos) et ses patterns sous 30 % PV s'inspirent des greffes refusées aux level-ups (proposition lore, à trancher en phase 2).

| Phase extra | Seuil | Pattern | Télégraphie | Durée | Cooldown | Paramètres |
|---|---|---|---|---|---|---|
| R | < 30 % | laser_sweep | 1 s | 2.5 s | 7 s | angularSpeed=1.6, length=700, damage=20 |
| R | < 30 % | ring | 0.5 s | 0.3 s | 2 s | count=16, projSpeed=300, projDamage=14, projSize=8 |
| R | < 30 % | charge | 0.5 s | 0.6 s | 3 s | speed=800, damage=26, stopOnWall=false, stunTime=0.6 |

## 9. Pièges du biome 1 (8 kinds)

Tous les pièges lisent `room.time` : à `phase` près, ils sont strictement périodiques. Une salle de pièges est un puzzle de timing.

| id | Nom | kind | Dégâts | Télégraphie | Période | Actif | Paramètres | Pattern |
|---|---|---|---|---|---|---|---|---|
| `trap_balayage` | Balayage laser | laser_sweep | 14 | 0.8 s | 4 s | 1.6 s | orientation=vertical, pingpong=true, thickness=0.5, hitOnce=true | Un rayon vertical parcourt la zone de gauche à droite en 1,6 s, puis revient au cycle suivant. |
| `trap_tourniquet` | Tourniquet | laser_rotate | 12 | 1 s | 6 s | 5 s | arms=2, lengthTiles=5, angularSpeed=1.2, startAngle=0, thickness=0.4 | 2 bras laser de 5 tuiles tournent (1,2 rad/s). Pause de 1 s tous les 6 s : la fenêtre pour traverser. |
| `trap_grille` | Grille | laser_grid | 10 | 0.5 s | 3 s | 1 s | spacingTiles=4, alternate=true, thickness=0.3 | Lignes laser espacées de 4 tuiles. Cycles alternés : verticales puis horizontales. 1 s allumé, 2 s éteint. |
| `trap_bouche` | Bouche de feu | wall_fireball | 12 | 0.6 s | 2.5 s | 0.2 s | dir=down, projSpeed=320, size=12, count=1, lifetime=3 | Une bouche murale crache une boule de feu droite toutes les 2,5 s. Se décale avec phase. |
| `trap_dalles` | Dalles à pointes | spike_tiles | 10 | 0.5 s | 2 s | 0.8 s | pattern=checker, groups=2, hitOnce=true | Damier : les cases paires sortent leurs pointes 0,8 s, puis les impaires. Toujours une case sûre à côté. |
| `trap_nappe` | Nappe de gaz | gas_zone | 8 | 1.2 s | 7 s | 3 s | radiusTiles=2.5, tickRate=4, slow=0.3, dps=true | Une bouche siffle 1,2 s puis libère un nuage de 2,5 tuiles pendant 3 s : 8 dégâts/s et -30 % vitesse. |
| `trap_rail` | Scie sur rail | saw_rail | 18 | 0.4 s | 3.2 s | 3.2 s | axis=x, lengthTiles=8, speedTiles=6, pingpong=true, radiusTiles=0.6, hitOnce=true | Scie circulaire qui fait des allers-retours sur un rail de 8 tuiles à 6 tuiles/s. Jamais de pause. |
| `trap_tourelle` | Tourelle fixe | turret_fixed | 9 | 0.7 s | 2.4 s | 0.3 s | mode=aim, angle=0, projSpeed=380, count=1, spread=0, projSize=6 | Tourelle murale : 0,7 s de visée (rayon rouge) puis 1 balle vers le joueur toutes les 2,4 s. Destructible ? Non. |

Conventions de placement en salle : `x,y` = coin haut-gauche en tuiles ; `w,h` = zone couverte (balayage : largeur balayée ; dalles : damier ; rail : longueur du rail ; grille : zone quadrillée) ; sans `w,h` = piège ponctuel (tourniquet centré sur la tuile, bouche/tourelle fixées au mur adjacent, nappe centrée). `phase` décale le cycle en secondes. `hitOnce` = un seul coup par joueur et par passage (pas de dégâts continus), sauf la nappe (`dps=true`, 4 ticks/s).

## 10. Salles du biome 1

| index | id | Type | refTime | Obstacles | Vagues | Pièges | Fragments |
|---|---|---|---|---|---|---|---|
| 1 | `room_b1_1` | PREP_COMBAT | 45 s | 5 | 3 | 0 | 0 |
| 2 | `room_b1_2` | TRAP | 60 s | 4 | 0 | 8 | 5 |
| 3 | `room_b1_3` | COMBAT_TRAP | 75 s | 4 | 3 | 5 | 0 |
| 4 | `room_b1_4` | CHEST | 20 s | 4 | 0 | 0 | 0 |
| 5 | `room_b1_5` | MINIBOSS | 120 s | 4 | 1 | 0 | 0 |
| 6 | `room_b1_6` | COMBAT_MODULAR | 80 s | 1 | 3 | 0 | 0 |
| 7 | `room_b1_7` | COMBAT_TRAP_MODULAR | 90 s | 2 | 3 | 2 | 0 |
| 8 | `room_b1_8` | CHEST_FINAL | 20 s | 0 | 0 | 0 | 0 |
| 9 | `room_b1_9` | BOSS_REVENGE | 150 s | 4 | 1 | 2 | 0 |

### Salle 1 — `room_b1_1` (PREP_COMBAT, ref 45 s)

Écran de prépa (arme + compétence), puis 3 vagues faciles. Piliers 1×1 pour apprendre à casser la ligne des Sentinelles ; muret central pour bloquer les bonds de Rôdeur.

Obstacles (tuiles) : (6,3) 1×1 · (6,9) 1×1 · (17,3) 1×1 · (17,9) 1×1 · (11,6) 2×1

| Vague | Déclenchement | Spawns |
|---|---|---|
| 1 | start | 2× `enemy_rodeur` @ (20,3) ; 1× `enemy_rodeur` @ (20,9) |
| 2 | clear | 3× `enemy_rodeur` @ bord aléatoire ; 1× `enemy_sentinelle` @ (21,6) |
| 3 | clear | 1× `enemy_nuee` @ (21,2) ; 2× `enemy_sentinelle` @ (21,10) ; 2× `enemy_rodeur` @ (2,1) |

### Salle 2 — `room_b1_2` (TRAP, ref 60 s)

Aucun ennemi. Trois zones à traverser : damier de pointes (x 3-8), double balayage laser décalé d'un demi-cycle (x 10-14 : le rayon est TOUJOURS quelque part, il faut suivre le trou), couloir de bouches de feu depuis le haut avec scie en travers (x 16-21), tourniquet devant la sortie. 5 fragments d'énergie placés dans les zones dangereuses, apparition échelonnée (0/0/8/16/24 s) pour forcer des allers-retours. Murs partiels en x=9 et x=15 canalisent le passage par le centre.

Obstacles (tuiles) : (9,0) 1×3 · (9,10) 1×3 · (15,0) 1×3 · (15,10) 1×3

| Piège | x,y | w×h | phase |
|---|---|---|---|
| `trap_dalles` | 3,3 | 6×7 | 0 s |
| `trap_balayage` | 10,0 | 5×13 | 0 s |
| `trap_balayage` | 10,0 | 5×13 | 2 s |
| `trap_bouche` | 16,0 | — | 0 s |
| `trap_bouche` | 18,0 | — | 0.8 s |
| `trap_bouche` | 20,0 | — | 1.6 s |
| `trap_rail` | 16,6 | 6×1 | 0 s |
| `trap_tourniquet` | 21,6 | — | 0 s |

Fragments d'énergie : (5,6) à 0 s · (12,6) à 0 s · (18,2) à 8 s · (19,6) à 16 s · (21,4) à 24 s

### Salle 3 — `room_b1_3` (COMBAT_TRAP, ref 75 s)

Tourniquet au centre (bras de 5 tuiles : il découpe la salle en 4 quadrants tournants), dalles à pointes dans deux coins (spawn d'ennemis), deux tourelles murales déphasées. Vague 2 introduit le Bloc : sa charge le fait traverser le tourniquet, qui le blesse aussi (les ennemis subissent les pièges à 50 % — règle proposée §13).

Obstacles (tuiles) : (4,2) 2×1 · (4,10) 2×1 · (18,2) 2×1 · (18,10) 2×1

| Vague | Déclenchement | Spawns |
|---|---|---|
| 1 | start | 3× `enemy_rodeur` @ (20,6) ; 2× `enemy_sentinelle` @ (21,2) |
| 2 | clear | 1× `enemy_bloc` @ (21,6) ; 4× `enemy_rodeur` @ bord aléatoire |
| 3 | clear | 2× `enemy_meche` @ (2,1) ; 2× `enemy_sentinelle` @ (21,10) ; 1× `enemy_nuee` @ (21,2) |

| Piège | x,y | w×h | phase |
|---|---|---|---|
| `trap_tourniquet` | 11,6 | — | 0 s |
| `trap_dalles` | 1,1 | 3×3 | 0 s |
| `trap_dalles` | 20,9 | 3×3 | 1 s |
| `trap_tourelle` | 8,0 | — | 0 s |
| `trap_tourelle` | 15,0 | — | 1.2 s |

### Salle 4 — `room_b1_4` (CHEST, ref 20 s)

Coffre + checkpoint. Quatre plots décoratifs. Aucune menace : respiration.

Obstacles (tuiles) : (8,4) 1×1 · (8,8) 1×1 · (15,4) 1×1 · (15,8) 1×1

### Salle 5 — `room_b1_5` (MINIBOSS, ref 120 s)

L'Étalon 07 seul, spawn à droite. Quatre blocs 2×2 en losange : chacun bloque le ring et le fan (pas le slam ni la charge), et surtout sert de **pivot** : tourner autour d'un bloc pendant qu'il vise expose son dos. Il ne s'arrête que contre les MURS extérieurs : s'aligner mur-bloc-joueur provoque une charge qui finit étourdie face au mur, dos offert.

Obstacles (tuiles) : (5,3) 2×2 · (17,3) 2×2 · (5,8) 2×2 · (17,8) 2×2

| Vague | Déclenchement | Spawns |
|---|---|---|
| 1 | start | 1× `boss_etalon_07` @ (18,6) |

### Salle 6 — `room_b1_6` (COMBAT_MODULAR, ref 80 s)

Squelette : 3 vagues avec Éclipse et Incubateur. Éléments modulaires à définir en phase 2.

Obstacles (tuiles) : (11,5) 2×3

| Vague | Déclenchement | Spawns |
|---|---|---|
| 1 | start | 2× `enemy_eclipse` @ bord aléatoire ; 2× `enemy_sentinelle` @ bord aléatoire |
| 2 | clear | 1× `enemy_incubateur` @ (21,6) ; 4× `enemy_rodeur` @ bord aléatoire |
| 3 | clear | 2× `enemy_bloc` @ bord aléatoire ; 3× `enemy_meche` @ bord aléatoire |

### Salle 7 — `room_b1_7` (COMBAT_TRAP_MODULAR, ref 90 s)

Squelette : grille laser sur presque toute la salle + nappe de gaz centrale, 3 vagues. Modulaire phase 2.

Obstacles (tuiles) : (6,6) 1×1 · (17,6) 1×1

| Vague | Déclenchement | Spawns |
|---|---|---|
| 1 | start | 1× `enemy_incubateur` @ (21,3) ; 2× `enemy_eclipse` @ bord aléatoire |
| 2 | clear | 1× `enemy_bloc` @ (21,6) ; 3× `enemy_sentinelle` @ bord aléatoire ; 2× `enemy_nuee` @ bord aléatoire |
| 3 | clear | 4× `enemy_meche` @ bord aléatoire ; 2× `enemy_eclipse` @ bord aléatoire |

| Piège | x,y | w×h | phase |
|---|---|---|---|
| `trap_grille` | 2,1 | 20×11 | 0 s |
| `trap_nappe` | 11,6 | — | 0 s |

### Salle 8 — `room_b1_8` (CHEST_FINAL, ref 20 s)

Squelette : coffre final (plancher de rareté sur le score moyen).

### Salle 9 — `room_b1_9` (BOSS_REVENGE, ref 150 s)

Squelette : Étalon 07 / rév. B + 2 tourelles murales. Non chargeable en phase 1.

Obstacles (tuiles) : (5,3) 2×2 · (17,3) 2×2 · (5,8) 2×2 · (17,8) 2×2

| Vague | Déclenchement | Spawns |
|---|---|---|
| 1 | start | 1× `boss_etalon_07` @ (18,6) |

| Piège | x,y | w×h | phase |
|---|---|---|---|
| `trap_tourelle` | 11,0 | — | 0 s |
| `trap_tourelle` | 12,12 | — | 1.2 s |

## 11. Synergies attendues (10 combos arme × améliorations)

| # | Arme | Améliorations | Pourquoi ça devrait être fort |
|---|---|---|---|
| 1 | Pistolet à ricochet | Balles chercheuses ×2 + Rebond ×3 + Rappel | 7 rebonds chercheurs + retour : chaque balle touche 3-5 fois, DPS ×3-4 sans viser. |
| 2 | Arc voltaïque | Surtension + Chaîne éclair ×3 + Détonation | Un tir = 4 cibles + 60 % de chance de 2 sauts supplémentaires + explosions en chaîne : les Nuées et les groupes de Rôdeurs s'évaporent. |
| 3 | Masse de pression | Onde tellurique + Crit explosif + Œil vif ×5 | Zone +35 %, 35 % crit, chaque crit et chaque kill explosent : nettoyage de salle en 2 coups, étourdissement en prime. |
| 4 | Lame d'essai | Lame dansante ×2 + Gâchette ×5 + Vampirisme ×3 | ~8 coups/s × 18 = 144 DPS, 12 % de lifesteal → ~17 PV/s au contact : tank de mêlée. |
| 5 | Brûleur court | Combustion ×2 + Étincelle ×3 + Cœur de verre | 60 DPS ×2 + brûlure 16/s garantie : ~140 DPS effectifs. 50 PV seulement : build "tout ou rien" à 170 px. |
| 6 | Arc tendeur | Corde tendue ×2 + Frappe lourde ×3 + Coup critique ×3 | Charge en 0,5 s, flèche à 30×3×2,2 ≈ 198 dégâts perçant 5 ennemis, crits à ×2,7 : one-shot des Blocs (140 PV). |
| 7 | Orbe orbitale | Constellation + Orbes gardiennes ×2 + Symbiose | 4 orbes d'arme + 4 orbes gardiennes = mur roulant qui bloque les projectiles ; avec Symbiose le joueur va CHERCHER les pièges pour se soigner. |
| 8 | Boomerang de rappel | Triple rappel + Rappel + Perforation | 2 boomerangs en vol, chacun 2 passages + retour Rappel (3e passage) : ~180 DPS théoriques sur une ligne. À surveiller (§13). |
| 9 | N'importe quelle arme | Dash + Sillage + Enchaînement ×2 + Récupération ×4 | Dash toutes les ~3 s avec 40 % de reset au kill : le sol devient un tapis de feu à 25 dps, le joueur ne s'arrête jamais. |
| 10 | N'importe quelle arme | Résonance + Double charge + Amplificateur ×2 + Saut de phase | 2 blinks à 4 s chacun, chaque blink = onde de 60×1,69 ≈ 101 dégâts + ralenti 1,5 s : la compétence devient l'arme principale. |

Synergies défensives à noter : Convalescence ×2 + Cicatrisation ×4 (+40 % PV et 30 bouclier par salle, 3,2 PV/s) rend la salle de pièges quasi gratuite ; Isolant ×2 (×0,36) + Isolation méta T3 (×0,61) = pièges à 22 %, et avec Marge (×0,5) à 11 % : Sol instable (×2) devient un bonus net. Marge + Symbiose : les pièges soignent 100 % de leurs dégâts calculés APRÈS `trapDamageMul` (proposition : appliquer `traps_heal` sur les dégâts bruts, sinon Marge se soigne deux fois moins que Neuf).

## 12. Effets NEW proposés (3 sur 6 autorisés)

| Effet | Hook | Params | Sémantique précise | Utilisé par |
|---|---|---|---|---|
| `NEW: skill_reset_on_kill` | `onKill` | `chance` (0..1), `fraction` (0..1) | À chaque kill, tirage `chance` ; en cas de succès, le cooldown **restant** de la compétence est réduit de `fraction` (0,5 = moitié du temps restant). Avec `double_skill`, s'applique à la charge en cours de recharge. Plusieurs stacks : tirages indépendants. Ne déclenche pas `onSkill`. | `upg_enchainement` (rare) |
| `NEW: charge_speed` | `passive` | `mul` (>1 = plus vite) | Le temps de charge de l'arme (`charge.min` et `charge.max`) est divisé par `mul`. Sans effet sur une arme sans `charge`. Stacks multiplicatifs. | `upg_syn_corde_tendue` (rare, bow) |
| `NEW: speed_burst` | `onDamaged` / `onTrapDamage` | `speedMul`, `duration` | Identique à `kill_speed` (multiplicateur de vitesse temporaire, non cumulable : la durée est rafraîchie) mais déclenché quand le joueur **subit** un coup (ou un piège). Se déclenche même si le coup est absorbé par un bouclier ; pas si esquivé (`dodge`). | `char_marge` (trait) |

Si ces effets ne sont pas retenus : remplacer *Enchaînement* par `cooldownReduction add 0.12`, *Corde tendue* par `fireRate mul 1.2` (les autres mods restent), et le hook de Marge par `speed mul 1.05`.

## 13. Notes d'équilibrage (à surveiller)

1. **Scoping de `const`** : `dev/content.js` commence par `const CONTENT = {` comme demandé, ce qui empêche la commande de vérification `eval(...)` donnée dans le brief de voir `CONTENT` (portée lexicale de l'eval direct). Vérifié avec la même commande après `const → var`, avec `new Function(src + ';return CONTENT')` et `node --check`. À l'intégration dans `index.html`, aucun problème.
2. **Boomerang + Rappel + Triple rappel** (§11 #8) est le combo le plus risqué : `pierce 99` × 3 passages × 2 boomerangs. Garde-fou proposé au moteur : un même projectile ne touche un même ennemi qu'une fois par passage, et `projectiles_return` n'ajoute pas de passage à une arme dont `special.kind === 'return'` (il rend le retour "chercheur" à la place).
3. **Orbe orbitale** : `fireRate` = ticks/s de contact ; si les 2 orbes touchent la même cible, 96 DPS. Acceptable car contact obligatoire, mais avec Constellation (4 orbes) il faut plafonner à 2 orbes touchant la même cible par tick ou baisser `damage` à 10.
4. **Cœur de verre + Fragile** (malus paire 2) = 37 PV : c'est voulu (build à haut risque), mais avec Protocole d'urgence il faut vérifier que la Nuée (5 × 5 dégâts) ne one-shot pas en enveloppement. Si oui, plafonner `hpMul` à 0,6.
5. **Lifesteal** : 4 % × 3 stacks = 12 % : sur 144 DPS (combo #4), ~17 PV/s. Plafonner le lifesteal effectif à 15 % ou le cumul de stacks de Vampirisme à 2 si l'Agent Test voit des runs immortelles.
6. **Ennemis et pièges** : règle proposée non écrite dans le schéma : les ennemis subissent les dégâts des pièges à 50 % (le Bloc traversant le tourniquet, la Nuée dans le gaz). Ça rend les salles COMBAT_TRAP tactiques ; sans cette règle, la salle 3 est nettement plus dure.
7. **Salle 2 (pièges)** : `refTime 60` suppose que le joueur ramasse les 5 fragments (le dernier apparaît à 24 s). Un joueur qui traverse sans les fragments finit en ~25 s ; le score de salle doit compter les fragments, sinon ils sont ignorés. Les 2 balayages déphasés de 2 s (période 4) signifient qu'un rayon est toujours en mouvement : c'est le passage le plus dur, à tester avec Sol instable (14 × 2 = 28 par contact).
8. **Mini-boss** : 900 PV pour 50 DPS nominal = 18 s de tir pur ; avec ~50 % de temps en esquive et le ×2 dans le dos, cible 35-45 s. Si l'Agent Test mesure < 25 s, monter à 1100 PV ; si > 70 s, baisser le cooldown de charge (plus d'occasions de passer derrière) plutôt que les PV. La règle `back` (cône 90° derrière, `coneAngle` 1,57 rad) est plus exigeante que `after_charge` : si le bot `__autoplay` ne l'exploite jamais, élargir le cône à 120° avant de toucher aux PV. Le `stunCooldown` de 3 s empêche le stun-lock à la Lame (3 coups/s dans le dos).
9. **Économie méta** : total 9 060 pièces pour tout maxer. Avec 150 pièces/run réussie, ~60 runs. Les 4 spéciaux (Mémoire, Aperçu, 4e choix, Re-roll) totalisent 3 330 : ce sont les achats "qualité de vie" prioritaires ; si les joueurs les ignorent au profit de Puissance, baisser leurs T1 à 60-80.
10. **Chance** : Trèfle ×4 (+8) + Chance méta (+10) = +18 luck → commun 42 %, épique ~21 %, colossal ~10 %. Un joueur maxé voit un colossal presque à chaque coffre. À plafonner (`luck` max 15) si les colossales perdent leur rareté.
11. **Nuée et XP** : 15 XP par groupe est généreux pour 40 PV totaux ; l'Incubateur qui en génère jusqu'à 4 (60 XP + 20 pièces) est une "ferme" si on le laisse vivre. Voulu comme dilemme risque/récompense, mais plafonner `max` à 3 si l'Agent Test observe du farming en salle 6-7.
12. **Skill `slowtime`** à 20 s de cooldown avec Réactivité T4 (-20 %) + Récupération ×4 (-24 %) + Amplificateur ×2 (-20 %) = 0,64 de réduction → 7,2 s de cooldown pour 3 s de ralenti à 35 % : proche de l'abus. `cooldownReduction` est plafonné à 0,8 par le schéma ; envisager un plafond à 0,6.

---

## 14. Phase 2 — salles 6 à 9 (implémenté)

| Salle | Type | Contenu |
|---|---|---|
| 6 | Combat + Modulaire | 4 vagues (Éclipses, Sentinelles, Incubateur, Rôdeurs, Blocs, Mèches, Nuées). Deux murs coulissants verticaux (colonnes 3 et 20, période 8 s, déphasés), un rotor à 2 bras de 4 tuiles au centre (0,55 rad/s), un sol qui alterne deux configurations de blocs toutes les 10 s (télégraphe 1,5 s). |
| 7 | Combat + Pièges + Modulaire | 3 vagues (Incubateur, Éclipses, Bloc, Sentinelles, Nuées, Mèches). Grille laser sur toute la salle (3 s), nappe de gaz centrale, deux tourelles aux flancs, un mur coulissant vertical central (période 10 s) et une **zone sûre mobile** (rayon 3 tuiles, parcours rectangulaire à 1,6 tuile/s) : toutes les 9 s, une impulsion inflige 15 dégâts à tout ce qui est hors de la zone (les ennemis prennent la moitié). |
| 8 | Coffre final | 3 choix (4 avec le passif), plancher calculé sur les salles 1-7, ou sur les 3 meilleurs scores avec *Mémoire sélective*. Checkpoint : consignation des crédits. |
| 9 | Revanche | Étalon 07 / rév. B : 3040 PV (×1,6), vitesse +10 %, phases 1-2 de la salle 5 + phase 3 sous 30 % (balayage laser, anneau de 16, charges à 800 px/s qui ne s'arrêtent que 0,6 s dans les murs). Plaque dorsale : la faiblesse est inactive jusqu'à 6 coups dans le dos, puis fenêtre de 0,4 s. Il copie la compétence choisie en salle 1 dès la phase 2. Deux tourelles fixes en haut et en bas. |

Fin de niveau après la salle 9 : tous les crédits en attente sont validés + prime de 150 (× gain de crédits).


---

## 15. Retour de playtest — greffes offensives et compétences (v2)

Compétences de base renforcées d'environ 20 % (dash 250 px / 5 s, bouclier 55 PV / 5 s, onde 60 dégâts dans 210 px / 9 s, dilatation 3,5 s / 16 s, tourelle 14 dégâts / 10 s / 14 s, saut de phase 280 px / 7 s, aimant 3 s / 10 s, surrégime +60 % / 6 s).

23 greffes ajoutées (74 au total : 22 communes, 27 rares, 17 épiques, 8 colossales) :

| Rareté | Greffes |
|---|---|
| Commun | Projectiles lourds (zone et recul), Munitions (dégâts + cadence) |
| Rare | Balles incendiaires, Balles électriques, Balles givrantes, Second canon (+1 projectile), Satellite (orbe), Tir arrière, Aura brûlante, Drone d'appoint, Exécution, Gel profond, Rafale |
| Épique | Salve (+2 projectiles), Ceinture d'astéroïdes (+3 orbes), Tir guidé, Éclats, Balles explosives, Foudre ambiante, Conducteur |
| Colossal | Tempête (foudre toutes les 0,7 s à 3 sauts), Mitraille (+3 projectiles guidés), Noyau (5 orbes + aura) |

---

## 16. Biome 2 — LA SERRE (palier -2)

Débloqué en mode Normal après la case 9 d'ADMISSION. Multiplicateurs de palier : PV ennemis ×1,3, dégâts ×1,2, vitesse ×1,08. Sol teinté vert, néons verts et ambre. Musiques `biome2.mp3` / `boss2.mp3`.

| Ennemi | Archétype | PV | Vitesse | Particularité |
|---|---|---|---|---|
| Ronce | rusher | 46 | 230 | ruée plus longue et plus rapide (640 px/s) |
| Pollinisateur | shooter | 36 | 140 | salve de 3 spores en éventail |
| Racine | tank | 240 | 95 | charge 620 px/s, étourdi 1 s au mur |
| Spore | kamikaze | 24 | 260 | explosion 100 px, 26 dégâts |
| Bourgeon | summoner | 110 | 65 | 3 moucherons toutes les 3,5 s, jusqu'à 6 |
| Moucherons | swarm | 10 | 300 | nuée de 5 |
| Liane | dasher | 55 | 190 | fonce à 780 px/s toutes les 1,7 s |

**Étalon 12, dite « la Serriste »** : 2600 PV (×1,3 = 3380), 2 phases (spirale à 3 bras, invocation de spores, charge, écrasement ; puis éventail de 9, balayage laser, charge, anneau de 16, moucherons). Faiblesse : après chaque charge, ses racines restent plantées 1,2 s (dégâts ×1,8). Revanche en salle 9 : PV ×1,5, phase 3 sous 30 %, mimétisme de la compétence.

Passifs de palier : Photosynthèse / Air lourd · Greffon sauvage / Sève corrosive · Récolte / Serre chaude.

Salles : 4 vagues avec élites dès la salle 1, salle 2 à 12 pièges et 6 fragments, salle 3 avec tourniquet à 3 bras et nappes de gaz, salle 6 avec rotor à 3 bras, salle 7 avec zone sûre plus petite et deux murs coulissants.

## 17. Rééquilibrage de la progression (retour joueur : « trop fort trop vite »)

Mesure bot (mode test, biome 1) avant → après : niveau après la salle 1 : 5 → 3-4 ; au mini-boss : 9-10 → 6-7 ; en salle 9 : 13 → 9-10.
- Courbe d'XP : `24 + 16·N + 2,6·N²` (au lieu de `14 + 9·N + 1,3·N²`), bonus de traversée parfaite 30 → 20 XP, trait de Neuf +20 % → +15 % XP.
- Poids de rareté : commun 62, rare 27, épique 9, colossal 2.
- Greffes offensives revues : Tranchant +10 %, Gâchette +8 % (4 paliers), Munitions +6 %/+5 % (3 paliers), Frappe lourde +22 %, Double canon -25 % dégâts, Second canon -12 %, Salve -30 %, Mitraille -20 % sans bonus de cadence, Satellite 10 dégâts (2 paliers), Drone 6 dégâts (2 paliers), Foudre ambiante 18 dégâts / 2,5 s, Aura brûlante 8 dégâts/s.

---

## 18. Défis de salle (salle 2 toujours, salle 6 à 60 %)

La salle 2 est une « salle aléatoire » : combat à 3 vagues avec un défi garanti, tiré parmi ceux non encore vus dans la run. Les salles de pièges seules ont été retirées. En salles 6 et 7, 60 % de chance de tirer un défi (`dev/38_challenges.js`). Le HUD affiche le défi et sa jauge ; le panneau debug permet de forcer un défi.

| Défi | Salles | Règle | Récompense / sanction |
|---|---|---|---|
| Capture de zone | 2, 6 | Trois zones successives (rayon 3 tuiles) : tenir dedans remplit la jauge en 6 s, sortir la vide en 12 s. Renforts toutes les 6 s (3 à 4 ennemis, à 80 % au corps à corps) tant que ce n'est pas fini. La porte n'ouvre qu'après la 3e zone. | Kills dans la zone : XP +50 % |
| Sol qui s'effondre | 2, 6 | Les pièges et éléments modulaires de la salle sont retirés. Des paquets de 3 à 6 dalles se fissurent 1,3 s puis tombent, de plus en plus vite, pendant tout le combat, jusqu'à 55 % du sol restant. Le joueur qui tombe : 12 dégâts et retour sur la dalle sûre la plus proche ; les ennemis tombent et meurent. Fin de salle par les vagues, comme d'habitude ; une passerelle se déploie alors vers la porte si le chemin est coupé. | Aucune pénalité, le sol est le danger |
| Séquence | 2, 6 | Trois interrupteurs I, II, III ; l'ordre s'affiche 4 s au début puis dans le HUD. Marcher dessus dans l'ordre ; erreur = décharge de 8 et remise à zéro. **Obligatoire** : la porte ne s'ouvre qu'avec les trois interrupteurs ET les vagues tuées. | 40 XP, 20 crédits |
| Lumières coupées | 2, 6 | Noir complet. À l'entrée, un seul halo au centre et aucun ennemi : le rejoindre déclenche le spectacle. Ensuite **un seul motif de lumière à la fois**, qui cède la place au suivant sur un temps fort toutes les 4 mesures (2 pour les motifs durs) : Poursuite (un grand halo qui passe près du joueur sans le suivre), Lucioles (deux petits halos qui sautent sur chaque temps), Balayage (une bande verticale qui traverse la salle), Croix (une bande verticale et une horizontale), Boule à facettes (six éclats tournants), Stroboscope (un éclair par mesure), Noir (deux mesures presque aveugles). Jamais deux fois le même motif d'affilée, jamais deux motifs durs à la suite. **Mouvement continu** : une source ne saute jamais d'un point à l'autre, elle glisse sur un ou deux temps avec un départ et une arrivée adoucis, et une fois sur quatre elle file en un demi-temps ; le balayage accélère au centre de la salle et la boule à facettes s'emballe sur chaque temps. Le joueur n'a **aucune lampe** : hors de la lumière il disparaît lui aussi, seuls ses **yeux blancs** restent visibles (les ennemis ont les yeux rouges, jaunes quand ils télégraphient). Ses projectiles restent lumineux, pour ne pas tirer complètement à l'aveugle. | XP +25 %, et +50 % d'XP pour un ennemi tué dans la lumière |
| Chrono | 2, 6, 7 | 60 s pour vider la salle. Après, tout ce qui reste et tout ce qui arrive est enragé (vitesse et dégâts +30 %, teinte rouge). | 30 crédits si tenu |

---

## 19. Objets au sol et apparence du Passeur

**Objets au sol** (en plus des cœurs, 3 % par kill) — deux objets maximum par salle :

| Objet | Apparition | Effet |
|---|---|---|
| Bourse | 50 % des drops d'élite (35 % de chance par élite tué) ; 6 % sur les ennemis de la dernière vague | 4 à 14 crédits en attente |
| Arme d'essai | Posée au sol dans une salle de combat tirée au sort par palier (1, 3, 6 ou 7), de préférence une arme non possédée | Remplace l'arme jusqu'à la fin de la salle, puis l'arme d'origine revient. Pas d'aimantation : il faut marcher dessus. |
| Allié | 20 % des drops d'élite, ou relique Sifflet | Un Passeur détraqué qui suit le joueur 25 s et tire 2,2 fois/s à 40 % des dégâts de l'arme |
| Relique | 30 % des drops d'élite, ou récompense de la Séquence | Effet pour la salle seulement : Jambon fumé (+40 PV, régén +3), Parapluie renforcé (bouclier 60, armure +3), Lunettes de visée (crit +30 %), Bottes de facteur (vitesse +30 %, cadence +15 %), Sifflet de chef de gare (allié) |

**Apparence** (`Sprites.drawBody`) : le personnage est **habillé dès la première salle**, et son apparence ne change plus en cours de run (voir §35). L'arme est dessinée en main, orientée vers la visée. Les greffes de brûlure, foudre, gel et poison ajoutent une aura (flammes aux pieds, arcs électriques, givre, bulles).

---

## 20. Salle du tempo (salle 7 des deux biomes, type `COMBAT_TEMPO`)

Une salle par palier joue en rythme avec la musique du biome. Le chef d'orchestre `Beat` lit `assets/music/tempo.json` (BPM, premier temps, tonalité, généré par `dev/analyze_music.py`) ; piste absente → métronome interne 120 BPM. Mesure à 4 temps.

| Élément | Règle |
|---|---|
| Entrée | Porte fermée, pièges éteints, bandeau « SALLE DU TEMPO » qui annonce la règle et le premier piège. Compte à rebours de deux mesures (la première pour lire la salle, puis 4-3-2-1 au centre), puis « GO ». Un liseré or bat sur tout le pourtour : on ne confond pas avec une salle de boss. |
| Pièges progressifs | La salle démarre **sans aucun piège**. Chaque vague demande la famille suivante, mais une famille ne peut pas arriver moins de **6 mesures** après la précédente : même si les vagues s'enchaînent vite, les pièges s'installent à un rythme tenable. L'arrivée est **annoncée deux mesures à l'avance** (8 temps décomptés sous la barre de mesure, cloche accordée sur les quatre derniers), puis le piège se met en place, également annoncé dans le HUD et non en bandeau — sinon l'annonce chevauchait celle des vagues. |
| Pièges | Cadence en temps musicaux (`params.beats`). Dalles à pointes en 4 zones : 4 coins qui frappent sur le 1 (deux zones) et le 3 (deux autres), 0,5 temps de pointes, 1 temps d'annonce. Bouches de feu haut/bas : une boule toutes les 2 mesures, décalées d'une mesure. Grille laser : 1 temps toutes les 4 mesures, 3 temps d'annonce (biome 1 uniquement). Tourelles murales : un tir toutes les 2 mesures, alternées. Biome 2 : + une zone de dalles centrale (sur le 2), deux nappes de gaz (2 temps toutes les 2 mesures, alternées), bouches en éventail. |
| Ennemis | Types normaux du biome, mais `beatLock` : ruée, tir, charge, dash et explosion n'arrivent que sur un temps (vague 1) ou une croche (vagues 2 et 3). Un voyant jaune bat au-dessus de leur tête. |
| Vagues | 3 vagues (ADMISSION : 5 / 8 / 8 ennemis ; LA SERRE : 5 / 8 / 10). Chaque vague entre sur le premier temps d'une mesure. |
| Joueur | Tir ou compétence à ±100 ms d'un temps : dégâts ×1,25 (+0,025 par combo, max ×1,5), compétence ×1,25 (dash plus long), note de la pentatonique de la piste (mineure ou majeure selon la tonalité détectée), flottant « TEMPO ×n », éclat autour du joueur. Un seul bonus par temps ; combo retombe après 2 mesures sans action en rythme. Jamais de malus. |
| HUD | Barre de mesure sous le cartouche de salle (4 points, le temps fort en jaune, curseur), combo, mention « métronome interne » si aucune piste. Vignette dorée sur le temps fort. |
| Visuels | Dancefloor : damier de dalles qui bascule à chaque temps, anneaux de dalles qui partent du centre à chaque temps (or sur le temps fort, cyan sinon). Égaliseur le long des murs haut et bas branché sur le spectre réel de la musique (`AudioEngine.spectrum`), pseudo-spectre calé sur le temps sans piste. Ennemis et joueur rebondissent sur le temps (+12 % / +7 %). Étincelles sur les piliers et légère impulsion de zoom caméra au temps fort. Compte à rebours : chiffre + anneau qui s'élargit. Paliers de combo 5, 10, 20, 30, 50 : gerbe de particules, bandeau « SÉRIE ×n ». |
| Fin | Porte fermée jusqu'au premier temps de la mesure suivante (« Dernier accord »), puis ouverture. XP : 4 par action en rythme (max 150) × gain d'XP ; +15 XP « sans fausse note » si aucun coup reçu. Pas de défi aléatoire dans cette salle. |

Tenue par le bot (autoplay, 4 armes, difficulté 1) : les 4 bots atteignent la salle 9 après le passage en salle 7 ; dégâts subis à niveau 7 entre 15 et 75.

### 20 bis. Boss en rythme (salles 5 et 9, `Boss.rhythmStep`)

| Élément | Règle |
|---|---|
| Phrase | 4 mesures (16 temps) ; 2 mesures sous 30 % PV. La première phrase démarre sur un temps fort après l'intro. La revanche (salle 9) joue décalée d'un demi-temps : mêmes phrases, tout tombe sur les contretemps. |
| Petites attaques (anneau, éventail, spirale, téléportation) | Lancées sur un temps avec une télégraphie d'un temps, donc elles partent sur le temps suivant. Cadence : temps fort de chaque mesure à pleine santé ; temps 1 et 3 sous 60 % ; chaque temps sous 30 %. Pendant la première moitié de la phrase seulement. |
| Utilitaires (invocation, bouclier, brouillage) | Sur le dernier temps de la première moitié, à la place d'une petite attaque. |
| Grosse attaque (charge, onde, laser, aspiration) | Télégraphie dès le début de la 3e mesure (2e sur phrase courte) jusqu'au temps fort de la dernière mesure, où elle part. Jauge d'annonce autour du boss. |
| Souffle | Après la grosse attaque, faiblesse active (dégâts ×mul de la faiblesse) jusqu'à la phrase suivante, « À BOUT DE SOUFFLE ». |
| Attaque libre | Coup de pied (onde de 110 px, 90 % des dégâts) si le joueur reste collé plus de 1,4 s, recharge 4,5 s, uniquement pendant la première moitié de phrase. Hors rythme, volontairement. |
| HUD / visuels | Partition de la phrase sous le cartouche (points blancs = petites attaques, orange = annonce, rouge = grosse attaque, vert = souffle, curseur), anneau de phrase autour du boss de la même couleur, vignette rouge et impulsion caméra à la grosse attaque. Bonus « en rythme » du joueur actif, sans compte à rebours ni dancefloor. Pièges de la salle sur leur horloge habituelle. |
| Attaque signature | Chaque boss a la sienne, pour qu'on ne les confonde jamais : **le Portier** (niveau 1) frappe le sol et une onde annulaire traverse la salle (`quake`, on la saute au dash) ; **la Serriste** (niveau 2) fait pousser des ronces qui blessent et ralentissent tant qu'on reste dedans (`roots`) ; **le Marshal** (niveau 3) sème des bâtons de dynamite autour du joueur (`mines`, mèche de 1,4 à 1,6 s) et, en deuxième phase, dégaine en duel (`duel` : longue visée, une balle très rapide, puis 1 s de rechargement à découvert). |
| Silhouette | Un corps différent par boss (démon, ogre, revenant sec) et un ornement dessiné : plaque d'acier boulonnée et voyant rouge pour le Portier, couronne de feuilles et fleur pour la Serriste, chapeau de shérif et étoile pour le Marshal. |
| Musique | boss1.mp3 : 129 BPM en ré majeur, même tempo que le biome ; sans piste, métronome interne 120 BPM. Désactivable pour les tests : `G.debug.noRhythm = true` avant le spawn (ancien séquenceur à recharges en secondes). |

Tenue par le bot (balayage 4 armes, difficulté 1) inchangée : pistolet, chaîne et boomerang atteignent la salle 9 (le boomerang gagne), l'arc meurt en 5.

---

## 21. Biome 3 — LA CONCESSION (niveau 3, western)

Mine abandonnée en plein désert. Difficulté ×1,55 PV, ×1,35 dégâts, ×1,12 vitesse. Débloqué après la salle 9 de LA SERRE. Musiques : `biome3-1.mp3`, `biome3-2.mp3`, `boss3.mp3`.

| Ennemi | Archétype | Sprite | Particularité |
|---|---|---|---|
| Coyote | rusher | wogol teinté sable | Ruée courte et rapide, recharge 1,1 s |
| Bandit | shooter | lizard teinté | Salve de 2 balles rapides, garde ses distances |
| Bison | tank | big_zombie teinté | Charge de 380 px, ×1,6 dégâts, sonné 1 s contre un mur |
| Baril de poudre | kamikaze | icône barrel (roule) | Explose au contact et à la mort, rayon 105 |
| Croque-mort | summoner | wizzard teinté | Lâche des scorpions par 3, jusqu'à 6 |
| Scorpions | swarm | icône scorpion | Nuée de 5, piqûre rapide |
| Crotale | dasher | icône rattlesnake | Sonne 0,45 s puis fond, pause 0,6 s |

| Piège | Kind | Note |
|---|---|---|
| Moulin | laser_rotate | 3 pales de bois, 5 tuiles, pause 1 s / 6 s |
| Wagonnet fou | saw_rail | 8 tuiles de rails, 6 tuiles/s |
| Tireur embusqué | turret_fixed | 1 balle / 2,2 s |
| Nuage de poudre | gas_zone | 10 dégâts/s, −30 % vitesse |
| Pièges à ours | spike_tiles | damier 0,8 s |
| Dynamite | wall_fireball | 1 bâton / 2,5 s |
| Barbelés | laser_grid | fils tous les 4 tuiles |

**Boss : Étalon 19, dit « le Marshal »** (3000 PV, big_demon teinté sable). Phase 1 : barillet (éventail de 6), tacle, dynamite (onde), meute de coyotes. Sous 55 % : tir en rond, lasso (balayage), tacle, barillet de 8, barils de poudre. Faiblesse `during_reload` : ×1,8 pendant 1 s après chaque attaque. Revanche : PV ×1,35, recharge 0,7 s, phase 3 sous 30 % (mitraille en spirale, anneau tournant, tacle à 900).

**Salles** : mêmes types que les autres biomes. Obstacles avec `kind` (cactus, rock, barrel, crate, wagon, cart, barrels, skull, windmill) dessinés par `Sprites.drawBlock` à partir des icônes ; décor au sol sans collision via `deco: [{ x, y, kind }]` (skull, tumbleweed, rails, wanted, saloon, windmill, barrels). Salle 7 (tempo) : pièges à ours sur le 1 et le 3, dynamite en éventail toutes les 2 mesures, nuages de poudre alternés, tireurs embusqués alternés.

**Accessoires** : `assets/sprites/western/*.svg`, icônes game-icons.net (CC BY 3.0, voir CREDITS.md) rastérisées en 16 à 26 px puis agrandies sans lissage (`Sprites.loadProps` / `drawProp`).

---

## 22. Habillage des salles (`Room.dress`, tous les biomes)

Chaque salle est habillée à son chargement, de façon déterministe (graine du sol) : la même salle est toujours habillée pareil.

| Élément | Règle |
|---|---|
| Obstacles | Un obstacle sans `kind` explicite en reçoit un du biome : ADMISSION cuves, réservoirs, casiers, tuyaux, perfusions, microscopes, poubelles ; LA SERRE jardinières, buissons, racines, plante carnivore, fioles, fontaines ; LA CONCESSION cactus, rochers, tonneaux, caisses, chariots. Rendu : ombre elliptique + socle sombre liseré de la couleur du biome (marque l'emprise qui bloque) + accessoire qui déborde vers le haut. |
| Décor au sol | 5 à 8 accessoires sans collision, semés sur des tuiles libres, à l'écart du départ du joueur (colonnes 0-2) et du couloir de la porte, jamais à moins de 3 tuiles l'un de l'autre. Un quart d'entre eux sont agrandis (`big`). Une salle qui déclare son propre `deco` n'est pas semée. |
| Accessoires | `assets/sprites/{western,lab,greenhouse}/*.svg`, icônes game-icons.net (CC BY 3.0) recolorées et rastérisées en 16 à 26 px puis agrandies sans lissage (`Sprites.loadProps` / `drawProp`). Aucun repli dessiné tant qu'un accessoire n'est pas chargé. |

---

## 23. Menu en deux temps (écran-titre + menu principal)

Le menu s'ouvre sur un **écran-titre** (`UI.showTitle`, appelé au démarrage) : titre, accroche et l'invite « Cliquez pour commencer », tout centré, la scène d'attraction passant en ombres chinoises derrière. Un clic, un tap ou n'importe quelle touche fait basculer sur le **menu principal** (`UI.showMenu`) au temps fort suivant ; le titre monte et rétrécit, il ne disparaît jamais.

| Effet | Source | Détail |
|---|---|---|
| Respiration du titre | CSS `--beat` | `.titlepulse` grossit de 3 % et s'éclaircit à chaque temps. |
| W doré | CSS `--down` | Le `W` grossit de 7 % et son halo triple sur le temps fort de la mesure. |
| Onde de choc | `renderMenuFx` | Un anneau part du titre à chaque mesure, cyan et or en alternance. |
| Saccade des lettres | CSS `--gx` | Le calque fantôme du titre se décale de ±4 px sur les contretemps, réaligné sur le temps fort. |
| Grain de pellicule | `renderMenuFx` | Trame de bruit 96 px animée, opacité 0,05 → 0,16 selon le volume de la piste (`AudioEngine.spectrum`). |
| Balayage de couleur | `renderMenuFx` | Une bande traverse l'écran en une mesure, largeur 80 → 380 px selon les graves, cyan/or en alternance. |
| Invite clignotante | CSS `--beat` | « Cliquez pour commencer » pulse exactement sur le temps. |
| Silhouettes | `renderAttractVeil` | Voile `rgba(4,5,9,.6)` supplémentaire sur l'écran-titre : le combat d'attraction n'est plus qu'une ombre. |
| Transition | `enterMenu` | `uiConfirm` au clic, puis sur le temps fort : flash blanc, grande onde, `bossBreath`, changement d'écran. |
| Arrivée des boutons | `menuUpdate` | Un bouton révélé par temps (classe `on`), chacun avec sa note de la pentatonique. |
| Projecteur | CSS `.mbtn::after` | Halo elliptique sur le bouton survolé ou sélectionné (or pour le bouton principal). |
| Note de sélection | `menuStep` | Flèches et survol jouent `uiHover` avec le degré de gamme du bouton (une note différente par ligne). |
| Validation sur la mesure | `barSync` | Le bouton s'allume (`armed`) et l'action part au temps fort suivant (repli : le temps suivant si la mesure est à plus d'un temps, 0,12 s sans musique). Le plein écran, lui, part immédiatement : il exige un geste de l'utilisateur. |
| Attraction arcade | `menuUpdate` | 20 s sans geste sur l'écran-titre : le voile se lève, la démo de jeu apparaît en clair avec la mention « DÉMONSTRATION ». Le moindre mouvement le referme. |

Pas d'égaliseur : écarté volontairement.

---

## 24. Biome 4 — LE SÉRAIL (niveau 4, oriental)

Palier 4, débloqué après le biome 3. Un palais-bazar enseveli sous les dunes : cour aux fontaines taries, colonnes cassées, moucharabiehs. Difficulté : PV ×1,75, dégâts ×1,42, vitesse ×1,15. Palette indigo et or (`tint rgba(72,50,140,.30)`, néons `#ffd166` / `#8f6ad8`). Musiques : `biome4-1.mp3` (salles 1-4), `biome4-2.mp3` (salles 6-8), `boss4.mp3` (salles 5 et 9) — 129,2 BPM, si majeur et mi mineur.

| Ennemi | Archétype | PV | Particularité |
|---|---|---|---|
| Derviche | rusher | 62 | Tourne puis fond sur vous, enchaîne vite (recharge 1 s). |
| Archer du sérail | shooter | 52 | Trois flèches en éventail, puis repli. |
| Colosse d'argile | tank | 360 | Charge à 400 px, se fend contre un mur (1,1 s sonné). |
| Jarre de naphte | kamikaze | 30 | Roule, nappe de feu de 110 px, explose aussi à la mort. |
| Charmeur | summoner | 140 | Sort 3 cobras toutes les 3 s, jusqu'à 6. |
| Cobras | swarm | 13 | Nuée de 5, morsure à 0,17 s. |
| Djinn de poussière | dasher | 70 | Se dissout, réapparaît dans le dos, traverse à 860 px/s. |

| Piège | Kind | Réglage |
|---|---|---|
| Roue à sabres | laser_rotate | 4 lames de 5 tuiles, 1,45 rad/s |
| Braséro roulant | saw_rail | 8 tuiles, 6 tuiles/s, aller-retour |
| Meurtrière | turret_fixed | visée 0,7 s, 1 flèche / 2 s |
| Encens narcotique | gas_zone | 3 s de fumée, 11 dégâts/s, -35 % vitesse |
| Dalles à pieux | spike_tiles | damier, 2 groupes alternés |
| Jarre de naphte | wall_fireball | 1 jarre / 2,4 s |
| Moucharabieh | laser_grid | rais tous les 4 tuiles, alternés |

**Boss : Étalon 27, dit « le Vizir »** (3200 PV, sprite `boss4` = wizzard_m agrandi ×1,6 et teinté violet — une silhouette haute et fine, à l'opposé des trois colosses des paliers précédents ; ornement `lamp` dessiné **par-dessus** le sprite, `crestOver: true`, `crestDy: -22`). Deux attaques n'existent que chez lui :

- **TEMPÊTE** (`sandstorm`, classée « big ») — un mur de sable traverse la salle de bord à bord. Une seule brèche, tirée au sort et **annoncée pendant la télégraphie** par deux traits dorés en pointillés : il faut rejoindre le couloir avant que le mur arrive. Toucher le mur coûte 26 dégâts et pousse le joueur.
- **MIRAGE** (`mirage`, classée « util ») — il se replace et laisse 3 doubles (4 puis 5 en phases suivantes) autour du joueur ; tous tirent la même salve, impossible de deviner d'où elle vient. Les doubles s'effacent juste après : **c'est la faiblesse du Vizir** (`rule: 'after_mirage'`, ×1,8 pendant 2,2 s, 1,6 s en revanche).

Le reste : CIMETERRES (éventail de 7 puis 9), ANNEAU, SABLIER (spirale). Il n'invoque rien — le mirage est sa **seule** attaque « utilitaire », pour qu'il revienne à chaque phrase de 4 mesures : sinon la rotation des utilitaires n'ouvrait la fenêtre de faiblesse qu'une phrase sur deux. Une phrase type : CIMETERRES sur le temps 5, MIRAGE sur le temps 8, TEMPÊTE sur le temps fort de la dernière mesure. Revanche : PV ×1,4, phase 3 sous 30 % (tempête à 620 px/s, mirage à 5 doubles, spirale à 3 bras).

**Salles** : mêmes types que les autres paliers. Obstacles `kind` propres au biome : `column`, `jar`, `vase`, `basin`, `palm`, `basket`, `brazier`, `drapes`, `archway`. Décor au sol : `lamp`, `lantern`, `spices`, `teapot`, `gems`, `scarab`, `eye`, `mosque`, `oasis`, `chalice`, `hourglass`, `carpet`, `incense`. Salle 7 (tempo) : dalles à pieux sur le 1 et le 3, jarres de naphte en éventail toutes les 2 mesures, encens alternés, meurtrières alternées.

**Accessoires** : `assets/sprites/orient/*.svg`, icônes game-icons.net (CC BY 3.0, voir CREDITS.md) rastérisées en 16 à 26 px.


---

## 25. Lumières coupées — vitesse suivable (correctif)

Le halo visait auparavant n'importe quel point de la salle en un ou deux temps : mesuré à **346 px/s de moyenne et 6 400 px/s en pointe** pour un joueur à **292 px/s**. Suivre la lumière était mathématiquement impossible.

Désormais chaque destination est tirée **autour de la position actuelle du faisceau**, dans un rayon égal à ce que le joueur parcourt pendant le trajet :

| | Durée du trajet | Vitesse visée | Distance |
|---|---|---|---|
| Déplacement normal | 2 temps | 0,85 × vitesse du joueur | ~230 px |
| Lucioles (une destination par temps) | 1 temps | 1,05 × | ~140 px |
| Pointe (22 % des trajets) | 1 temps | 1,55 × | ~210 px |

Mesures après correctif (`lightmoves.js`, joueur à 336 px/s) : lucioles 280 px/s de moyenne, croix 136, **maximum 458 px/s soit 1,36×** le joueur sur une pointe courte — on recolle toujours. Le balayage fait un va-et-vient au lieu de se téléporter au bord opposé ; la boule à facettes tourne à 0,62 rad/s sur une orbite de 210 px (≈ 130 px/s) ; le halo de poursuite passe de 165 à 185 px de rayon.

Un **cercle en pointillés marque la destination** pendant tout le trajet, relié au halo par un trait fin : on coupe au plus court au lieu de courir derrière.

---

## 26. Terrain de salle (jalons 0 et 1)

Une salle peut déclarer un **plan de terrain** : 13 chaînes de 24 caractères, lisibles et modifiables à l'œil dans `content*.js`. Au chargement, `Terrain.compile` en tire une grille (`room.grid`, un `Uint8Array` de 312 codes) et fusionne les tuiles solides en rectangles poussés dans `room.obstacles` — tout le pipeline existant (collision, projectiles, rendu) continue de ne voir que des rectangles.

Le point clé : **« bloque les pas », « arrête les balles » et « coupe la vue » sont trois choses distinctes**. Avant, tout obstacle faisait les trois. `pointBlocked(x, y, r, mask)` prend maintenant un masque `move` / `shot` / `sight`.

### Types disponibles

| Car. | Type | Pas | Balles | Vue | Vitesse | Note |
|---|---|---|---|---|---|---|
| `.` | sol | — | — | — | ×1 | |
| `#` | mur | bloque | arrête | coupe | — | l'obstacle classique, mais en tuiles |
| `n` | **muret** | bloque | **passent** | **passe** | — | **franchissable au dash du joueur** |
| `:` | **moucharabieh** | passe | passent | **coupe** | ×0,90 | active les branches `lineOfSight` de l'IA |
| `=` | pont | — | — | — | ×1 | passage sec au-dessus d'une surface |
| `~` | eau | — | — | — | **×0,72** | zéro dégât |
| `,` | boue | — | — | — | **×0,55** | zéro dégât |

Le ralentissement s'applique au joueur et aux ennemis par le même canal (`this.slow`), donc il couvre marche, ruée, charge et dash d'un coup. **Les boss l'ignorent** : les ralentir casserait leurs phrases rythmiques.

Chaque biome peut repeindre les types via `palette.terrain` : l'eau de LA SERRE est vert d'eau, la roche de LA CONCESSION est brun sombre, les murets du SÉRAIL sont crème.

### Les trois premières salles

**LA SERRE, salle 1 — « la rivière »** (`refTime` 55 → 62). Deux bras d'eau, trois passages secs. Rien n'est interdit, tout est taxé : le pont est sûr mais prévisible, le gué coûte 28 % de vitesse.

```
........~~~....~~.......      ........~~~....~~.......
........~~~....~~.......      ........~~~....~~.......
........~~~....~~.......      ........===....~~.......   ← pont haut
........===....~~.......      ........~~~....~~.......
........~~~....~~.......      ........~~~....==.......   ← passage de la porte
```

**LA CONCESSION, salle 3 — « l'entonnoir »** (`refTime` 90 → 105). Deux masses rocheuses convergent en un **col de 3 tuiles** (2 minimum pour qu'un bison passe). 83 % de sol marchable au lieu de 97 %.

```
........#########.......
.........#######........
..........#####.........
...........###..........
............#...........
........................   ← le col
........................
........................
............#...........
...........###..........
..........#####.........
.........#######........
........#########.......
```

Le moulin est passé de (11,6) à (5,6) : ses pales de 5 tuiles ne tenaient pas dans le col. La meurtrière de (16,12) et un spawn de bison de (12,11) tombaient dans la roche, déplacés en (19,12) et (19,11).

**LE SÉRAIL, salle 3 — « les terrasses »** (`refTime` 95 → 108). Deux murets à brèches décalées et deux moucharabiehs. Le combat ne s'interrompt jamais — les balles passent — mais chaque déplacement demande un détour, ou un dash.

```
........................
.......n...::...n.......
.......n...::...n.......
...........::...n.......
.......n................   ← brèche
.......n........n.......
.......n........n.......
.......n........n.......
.......n................   ← brèche
...........::...n.......
.......n...::...n.......
.......n...::...n.......
........................
```

### Garde-fous

`node dev/check-terrain.js` relit les quatre `content*.js` hors ligne : nombre de lignes, largeur, caractères inconnus, tuile d'entrée praticable et **porte atteignable depuis l'entrée** (parcours en largeur). Une salle coupée en deux est une run perdue : ça doit casser le build, pas se découvrir en jouant. Le même contrôle tourne aussi au chargement (`Terrain.connected`) et écrit un avertissement dans la console.

Le décor n'est semé que sur du sol nu (`Terrain.plain`) : pas de tapis au fond du bassin ni de plante sur un pont. Les obstacles issus du terrain portent `terrain: true` et échappent à `Room.dress`.

---

## 27. Étape 0 du chantier rythmique — cinq réparations

Aucun contenu neuf : ces cinq points rendent musical ce qui était déjà écrit.

**1. L'horloge est choisie par piège.** `Room.trapTime(r, t)` renvoie l'horloge musicale dès qu'un piège déclare `params.beats`. C'était décidé **par salle** : seule la salle 7 jouait en mesure, et un piège rythmique posé ailleurs tournait à la bonne vitesse sur une phase sans rapport avec la musique. Les pièges des salles de boss n'en déclarent aucun, ils gardent l'horloge de salle — les phrases des boss ne sont pas perturbées.

**2. Les quatre familles de la salle du tempo s'arment enfin.** `Tempo.onWave` n'est appelé qu'à partir de la deuxième vague, pour que la salle démarre sans piège. Avec **4 familles déclarées pour 3 vagues**, les deux dernières ne s'armaient jamais — dans les quatre biomes. La salle du tempo jouait donc depuis toujours avec la moitié de son orchestre. `tryAnnounce` a maintenant un filet de sécurité : passé 10 mesures sans nouveauté, la famille suivante s'annonce d'elle-même. Vérifié : 4/4 armées.

**3. Les trajets continus sont calés sur le temps.** `beats.turn` (temps par tour) et `beats.trip` (temps par aller) convertissent la vitesse de rotation et celle du rail en durées musicales. `syncBeat` convertissait la période mais **jamais `angularSpeed`** : le tourniquet, le moulin et la roue à sabres tournaient en rad/s, croisaient le joueur à un instant arbitraire, et dérivaient. Les quatre pièges tournants du jeu sont passés à **un tour par mesure** — leurs bras croisent les quatre directions cardinales sur les quatre temps. Ils sont en salle 3, hors salle du tempo : c'est ce que le point 1 rend possible.

**4. Le joueur a une vélocité de poussée** (`pl.kvx / pl.kvy`), que seuls les ennemis avaient. Amortissement de 10/s : **la distance parcourue vaut l'impulsion divisée par 10** (1440 px/s = 3 tuiles). C'est le prérequis de tous les pièges qui déplacent sans blesser.

**5. Le mix des pièges descend sous la musique.** `trapSpike` 1,4 → 0,7 (c'était le son le plus fort du jeu, presque 3× le pistolet du joueur), `trapWarn` 1,1 → 0,6, `trapSaw` 0,4 → 0,25, `trapLaser` 0,5 → 0,4, `trapGas` 0,45 → 0,4. L'espacement des annonces passe à 0,23 s — un temps à 129 BPM, donc jamais deux annonces sur le même temps. Le grincement du rail se cale sur le temps au lieu de 2 Hz : contre une pulsation à 2,153 Hz, il produisait un battement lent de 0,15 Hz, exactement la sensation « ça frotte ». Et **la tourelle a son propre son** (`trapShot`, percussion sèche non accordée) : elle jouait `shootPistol`, le son de l'arme du joueur.

**Bonus : la partition au sol.** `Tempo.renderScore` marque les tuiles qui vont être frappées — coins dorés un temps à l'avance, cadre plein un demi-temps avant. Elle s'applique à **toute** salle contenant des pièges rythmiques, pas seulement la salle 7. C'est la couche de lisibilité qui permettra de composer sans que la salle devienne un sapin de Noël.

---

## 28. Atelier rythme — fabriquer une salle à l'oreille

`dev/80_atelier.js`, ouvert par **F2** (ou le bouton « Atelier rythme » du panneau debug, ou l'adresse `?atelier=1`). Il donne une salle vierge, la piste du biome découpée en temps cliquables, et une partition par élément posé. Rien n'est simulé à part : ce sont les vrais pièges du jeu, sur la vraie piste, dans une vraie salle — ce qu'on entend dans l'atelier est ce qu'on aura en partie.

### La partition libre

Un piège pouvait déjà déclarer une cadence musicale, mais **une seule période** : `beats: { period: 4, active: 1, telegraph: 1, on: 0 }` veut dire « une fois toutes les 4 temps, sur le temps 0 ». Impossible d'écrire un motif. Le format s'ouvre :

```js
params: { beats: { bars: 2, hits: [0, 1.5, 2, 3.5], telegraph: 1, active: 1 } }
```

- `bars` : longueur de la boucle en mesures (4 temps chacune) ;
- `hits` : les temps frappés dans cette boucle, fractions acceptées (`1.5` = la croche après le deuxième temps) ;
- `telegraph` / `active` : annonce et durée d'un coup, en temps.

`Trap.cycleHits` remplace `Trap.cycle` dès que `hits` est là. Le coup *i* de la boucle *L* porte l'indice `L × n + i`, qui croît avec le temps : les avertisseurs sonores et les alternances qui s'appuient sur cet indice (aller-retour du balayage, groupes de dalles) marchent sans changement. Les bouches de feu et les tourelles ne passent pas par `cycle` mais par leur propre horloge `p.every` : `Trap.fireCycle` leur donne le même repère dans les deux formats. **L'ancien format continue de fonctionner tel quel** — les quarante déclarations existantes n'ont pas bougé.

### Le panneau

| Réglage | Effet |
|---|---|
| **Mode : pose / test** | En pose, le clic dans la salle pose ou choisit un élément (il ne tire pas). En test, on joue normalement. |
| **Biome / Piste** | La piste jouée : biome salles 1-4, biome salles 6-8, ou boss. Change le BPM, donc la durée d'un temps. |
| **Boucle** | 1, 2, 4 ou 8 mesures. C'est la longueur de la partition. |
| **Grille** | Subdivision des cases : noires, croches, doubles ou triolets. |
| **boucler** | La lecture revient au début de la boucle quand elle en sort. |
| **métronome** | Un clic sur chaque temps, plus fort sur le premier de la mesure. |
| **◀ mesures 5–8 ▶** | Déplace la fenêtre de travail dans le morceau. |

La **règle** en haut de la grille porte un repère par subdivision, numéroté `mesure·temps` : **un clic dessus place la lecture sur ce temps**, sans chercher dans une forme d'onde. Chaque élément posé a sa ligne : un clic sur une case ajoute ou retire un coup à cet endroit. Le trait cyan est la tête de lecture.

Sous la ligne choisie viennent ses réglages : largeur, hauteur, annonce et durée en temps, et « Dupliquer ». **Suppr** enlève l'élément choisi. « Mur » pose un obstacle de décor (sans partition).

### Sortir le morceau

« Exporter » écrit le bloc à coller dans un `content*.js` : `obstacles:` s'il y a des murs, puis `traps:` avec un `params.beats` complet par élément. Le texte se termine par un commentaire `/* atelier:{…} */` que « Importer ce texte » sait relire : l'aller-retour est complet, on peut ranger une partition dans un fichier et la reprendre. Le travail en cours est de toute façon gardé dans le navigateur (`localStorage`, clé `way_atelier_v1`).

### Garde-fous

`atelier.js` (scratchpad, Playwright) vérifie l'ouverture, la salle vierge, la pose au clic, la grille, l'export, l'import, la tête de lecture, les murs et la fermeture — et surtout que le piège est **actif exactement sur les temps cochés** et **annoncé un temps avant**, en comparant les états de `cycleHits` à la liste attendue. Attention en écrivant ce genre de test : échantillonner pile sur les bornes d'une fenêtre donne des résultats faux à 10⁻¹⁴ près, il faut viser le milieu des cases.

---

## 29. Deux mécaniques de tir, et trois réparations de l'atelier

### `emitter` — lanceur de projectiles en motif

Un coup = une salve. Quatre paramètres suffisent à couvrir la couronne, la spirale, l'éventail et la visée :

| Paramètre | Effet |
|---|---|
| `count` | projectiles par salve |
| `arc` | ouverture en radians — `2π` = couronne complète, `0.5` = trois coups serrés |
| `spin` | rotation de la salve d'un coup au suivant : c'est ce qui dessine la spirale |
| `pattern: 'aimed'` | la salve part vers le joueur au lieu de suivre `angle` |
| `burst` / `burstGap` | plusieurs salves coup sur coup, espacées de `burstGap` temps |

L'espacement des rafales se compte en **temps réel** et non en temps musical : dans l'atelier la lecture revient en arrière à chaque boucle, une rafale en cours resterait coincée. Une rafale oubliée plus de 2 s est abandonnée.

Neuf pièges neufs s'appuient dessus ou sur le rayon : **Diffuseur**, **Gyrophare**, **Rayon mural** (biomes 1 et 2), **Gatling**, **Revolver**, **Fil de détente** (biome 3), **Lanterne à braises**, **Derviche de lames**, **Rai de soleil** (biome 4). Ils sont dans les `trapPool`, donc dans la palette de l'atelier ; aucune salle existante n'en déclare, l'équilibre du jeu ne bouge pas.

### `laser_beam` — rayon mural

Un rayon fixe depuis son socle jusqu'au bord de la salle, taillé au rectangle de la pièce, qui s'allume et s'éteint franchement sur la partition. `angle` l'oriente, `length` le raccourcit, `thickness` l'épaissit. C'est la coupure nette qui manquait pour jouer en mesure : on passe entre deux allumages.

### Trois réparations

**Les tireurs sur des coups rapprochés.** Une bouche de feu à qui on donnait les temps 1 · 1,5 · 2 n'en tirait qu'un. Le déclenchement passait par un *cycle* dont le début était `coup − annonce` : avec une annonce d'un temps et des coups espacés d'un demi-temps, les cycles se chevauchaient et le suivant écrasait le précédent. `shotState` remplace ce découpage : un coup est un **instant**, pas un cycle. Il renvoie l'indice du dernier coup dû, celui du prochain, et la chaleur d'annonce.

**Les tireurs après une boucle.** Plus grave et invisible en jeu : le déclenchement comparait l'indice du coup à un compteur croissant (`fireCount`). Dans l'atelier la lecture revient en arrière à chaque boucle, l'indice redescend, et le piège ne tirait **plus jamais** après le premier tour. La comparaison porte maintenant sur le dernier coup joué (`lastShot`), qui accepte que le temps recule. Au premier réveil le piège note l'indice courant sans tirer : il ne rejoue pas un coup déjà passé.

**Les trajets continus dans l'atelier.** Un tourniquet posé sans réglage tournait à la vitesse du contenu (rad/s), sans rapport avec la boucle : il s'éteignait, tournait dans le noir et se rallumait à un angle arbitraire — vu comme « il clignote et revient en arrière ». L'atelier écrit maintenant `turn` (temps par tour) et `trip` (temps par aller) par défaut, et les pièges à trajet continu naissent allumés toute la boucle (`durée = 0` veut dire « toute la boucle »).

### Réglages par élément

La ligne choisie ouvre ce qui a du sens pour sa mécanique : largeur, hauteur, annonce, durée, **couleur** (`params.color`, qui surcharge celle du contenu), **orientation** en degrés, sens horizontal/vertical, tour et aller en temps, nombre de bras, de projectiles, ouverture, rotation par coup, rafale. Les repères de pose sont passés à une ligne sur quatre très effacée, avec une case pour les couper, et le **mode test** les retire tous — grille, cadres et partition au sol (`room.noScore`) — pour voir la salle telle qu'elle sera jouée.

---

## 30. Décor animé en rythme, et l'atelier en trois établis

### `dev/33_anim.js` — du décor qui joue

Des éléments **sans collision et sans dégât**, pilotés par la même partition que les pièges. Ils ne portent pas la difficulté, ils portent la lecture : quand une dalle change de couleur sur le temps, l'oreille et l'œil disent la même chose.

| Type | Ce qu'il fait | Réglages propres |
|---|---|---|
| **Dalles colorées** | la zone prend la teinte sur le coup, puis s'efface | motif : toutes / damier / vague |
| **Dalles qui montent** | léger relief qui monte (ou s'enfonce) sur le coup | amplitude, sens, motif |
| **Rotatif** | un quart de tour (ou l'angle voulu) à chaque coup | pas, image, taille |
| **Sauteur** | l'accessoire décolle et retombe | amplitude, image, taille |
| **Lumière** | halo coloré additif qui bat | rayon, intensité, 2ᵉ couleur |
| **Onde** | anneau qui s'ouvre sur le coup | rayon |

Tous acceptent une **2ᵉ couleur**, alternée d'un coup au suivant. `beatPulse(beats, rt)` est l'enveloppe commune : temps écoulé depuis le dernier coup, temps jusqu'au prochain, indice du coup, et `k` qui va de 0 au coup à 1 au bout de `active`. Les éléments au sol sont dessinés juste après le décor (donc sous les obstacles et les entités), les lumières par-dessus la salle en mode additif.

Une salle les déclare dans `anims: [ { kind, x, y, w, h, params, beats } ]`.

### Images de l'auteur

Le choix « image » d'un rotatif ou d'un sauteur liste tous les accessoires connus du jeu. Le bouton **+ image** accepte un fichier local : il devient un accessoire utilisable tout de suite et reste dans le navigateur (`way.props.custom`). Pour l'avoir dans le jeu pour de bon, le fichier doit ensuite rejoindre `assets/sprites/pixel/`.

### Trois établis

L'atelier se divise pour ne pas encombrer la page :

- **Animations** — le décor qui joue. Chaque ligne a sa partition.
- **Pièges** — ce qui blesse. Même grille, mêmes réglages.
- **Niveau** — l'éditeur de salle : blocs, les sept terrains (sol, mur plein, muret, claustra, pont, eau, boue) au pinceau, et les ennemis rangés par vague. « Relancer les vagues » les fait rentrer à nouveau.

Chaque établi ne montre que ses lignes. Le **mode test** replie le panneau, retire grille, cadres et partition au sol : la salle telle qu'elle sera jouée. La porte reste fermée en permanence — on ne sort pas de l'atelier en marchant dessus.

L'export sort maintenant, dans l'ordre d'une déclaration de salle : `terrain`, `obstacles`, `anims`, `waves`, `traps`, plus le bloc `atelier:` que l'import relit.

---

## 31. Compagnons et copains — l'atelier « Amis »

Le jeu ne livre **aucun** compagnon ni personnage d'ami : ce sont ceux avec qui on joue qu'on met dedans, à partir de leurs photos. Le quatrième établi de l'atelier (F2 → **Amis**) sert à ça, et son export est le fichier `dev/content5.js`.

### Ce qu'on crée

**Un animal de compagnie** : une photo, un nom, un rôle, et il vous suit toute la run en jouant son tour **en mesure**. Neuf rôles, qui sont les comportements du moteur :

| Rôle | Ce qu'il fait |
|---|---|
| pique en vol | fond sur l'ennemi le plus proche, et rien ne l'arrête en vol |
| mord et attire les coups | court au contact ; les ennemis proches s'en prennent à lui plutôt qu'à vous |
| crache à distance | reste dans vos jambes et tire une gerbe sur l'ennemi le plus proche |
| ramasse à votre place | aimante crédits, cœurs et fragments ; ne se bat pas |
| brise les tirs ennemis | tourne autour de vous et casse les projectiles qu'il croise |
| soigne | rend quelques PV, régulièrement |
| charge en ligne droite | se met en boule et traverse la salle, bousculant tout |
| désigne une cible | l'ennemi marqué encaisse 30 % de plus — le seul qui ne tape pas lui-même |
| harcèle sans relâche | tourne autour de sa cible et pique à chaque temps |

Réglables : dégâts, cadence (du temps à la mesure), taille, teinte, prix au hub, et la phrase qui le décrit.

**Un copain** : son visage devient un **personnage jouable**. La photo est collée à la place de la tête sur le corps dessiné en pixels — un personnage qui porte un visage garde toujours ce corps-là, jamais la planche de sprites, sinon la planche de sprites recouvrirait le visage. Réglables : PV, vitesse, chance, arme de départ, et un caractère choisi parmi sept (apprend vite, cogne fort, va vite, encaisse, vise juste, a de la chance, aucun).

### Quelle taille pour une image

**32×32 n'est pas petit** : c'est le double de la résolution native du jeu, dont les sprites font 16 px rendus ×3 (`SCALE = 3`, `TILE = 48`). Ce qui compte n'est pas la finesse de la source mais le **multiple d'affichage** — une image de 32 px montrée en 64 garde des pixels carrés, montrée en 48 elle serait rééchantillonnée en ×1,5 et perdrait sa netteté.

Repères à l'écran : une tuile fait 48 px, le joueur 48 × 75. Un animal naît donc à **64 px** (×2 d'une image de 32, et un peu plus gros qu'une tuile : c'est la taille qui « fait animal » à côté du joueur), réglable de 16 à 128 par pas de 8.

Une image déposée est **reprise telle quelle** si elle tient déjà dans 128 px : jamais agrandie, jamais lissée. Un pixel art agrandi — a fortiori en lissant — perd exactement ce qui en fait du pixel art. Seules les photos d'appareil sont réduites (à 128 px, recadrées au carré), et là le lissage sert puisqu'il s'agit de photos. Le dessin, lui, se fait toujours en pixels francs.

Vérifié par un damier de 1 pixel importé en 32×32 : dessiné en 64, il ne compte que ses trois couleurs d'origine — aucune teinte intermédiaire, donc aucun lissage et une mise à l'échelle entière.

### Trois images pour quatre directions

Un sprite peut être une image unique ou un jeu de vues **sud (face), est (profil), nord (dos)**. L'ouest est l'est **retourné** : trois images suffisent aux quatre directions, et c'est la façon la plus économique de dessiner un personnage à la main.

Une seule image fournie sert à toutes les directions — on peut donc commencer avec une vue et compléter plus tard, les emplacements remplis étant marqués en vert dans l'atelier.

La vue affichée vient du **déplacement réel** (pour un compagnon, la différence de position d'une image à l'autre ; pour le joueur, sa direction de marche, ou de visée à l'arrêt). Le profil l'emporte en cas de diagonale, avec une marge de 1,2 : c'est la vue la plus lisible et souvent la mieux dessinée.

### Une démarche sans animation

En attendant de vraies planches, un sprite figé n'est pas figé pour autant : `Sprites.gait(walk)` donne un **rebond** (2,4 px d'amplitude), un **balancement** (0,1 rad) et une **respiration** (4 % de largeur, en sens inverse de la hauteur — le corps s'écrase en touchant le sol). À l'arrêt, tout cela retombe à zéro, seul un souffle très lent subsiste. Ce n'est pas une animation, c'est ce qui empêche une image unique de paraître collée au sol.

### Planches d'animation

Une planche est une **grille de cases carrées lues dans l'ordre de lecture**. Elle entre dans le jeu **sans aucune retouche** — ni recadrage ni redimensionnement, sinon la grille ne tombe plus juste. La taille de case est devinée en comptant les colonnes et les lignes réellement occupées (une planche a des gouttières transparentes), et reste modifiable.

Cinq clips, dans cet ordre de priorité à l'écran : **mort** (joue une fois et se fige sur la dernière image), **ramasse**, **tir**, **marche**, **repos**. Cadences : repos 6 im/s, marche 12, tir 14, ramassage 12, mort 8. Le ramassage n'est pas déclenché par les pièces — l'animation ne ferait que sursauter.

Deux repères sont calculés au chargement de la planche :

- **Les pieds.** Une planche a presque toujours du vide sous le personnage ; la fraction de case occupée jusqu'au bas du dessin est mesurée, et le sprite est posé de sorte que ce bas tombe sur la ligne de sol du corps standard. Sans ça le personnage flotte d'autant de pixels que la marge.
- **La taille d'affichage** est proposée à **deux fois la case** : pixels carrés, et une silhouette de la hauteur d'un personnage du jeu (mesuré : 38 × 88 px pour Martin, contre 30 × 72 pour le corps standard).

Une planche prime sur le sprite fixe, qui prime sur le visage collé : c'est toujours le dessin le plus fini qui gagne. La démarche procédurale (`gait`) s'efface pendant la marche animée — la planche fait déjà le travail.

**Martin** (`char_martin`, dans `content5.js`) est le premier personnage dessiné à la main : cinq planches de 3 × 3 cases de 48 px, vue de profil — chemise rose, cravate verte, lunettes et barbe. Ses caractéristiques sont volontairement neutres pour l'instant.

### Visage collé ou sprite entier

Un copain accepte les deux :

- **Visage** : la photo est collée à la place de la tête sur le corps dessiné en pixels du jeu. Le personnage garde ce corps-là quoi qu'il arrive (jamais la planche de sprites), sinon la planche de sprites recouvrirait le visage.
- **Sprite entier** : l'image remplace le corps, posée sur la ligne de sol du corps standard, à la taille demandée. C'est la voie pour un personnage entièrement dessiné à la main. Un bouton retire le sprite entier pour revenir au visage collé.

Tout est versé dans le contenu **tout de suite** — l'animal est adoptable par « Essayer », le copain prend les commandes — et gardé dans le navigateur pendant qu'on travaille. `Content.invalidate()` est appelé à chaque changement : l'index par id est mis en cache, et sans ça un personnage créé en cours de partie reste introuvable et l'appel retombe silencieusement sur le premier de la liste.

### Trois façons de l'emmener

Le choix se fait au hub et vaut pour la run entière. C'est un vrai triangle : sans contrepartie au troisième, personne ne le prendrait jamais.

| Mode | Ce que ça donne |
|---|---|
| **Tout le temps** | Il suit du début à la fin, à sa force normale. |
| **À l'appel** | Absent. La touche **C** l'appelle : **son arrivée est une onde de choc** (160 px, 18 dégâts, recul 3, centrée sur le joueur — `PET_MODES.call.arrival`), puis il frappe à **×1,6 dégâts et cadence doublée** pendant 12 s, et se repose 25 s. Un badge montre la jauge de présence ou de repos. |
| **Personne** | Aucun animal, mais le joueur garde sa part : **+35 % de PV max et +20 % de dégâts**, toute la run (chantier 5 : c'était +12 % / +20 PV, jamais choisi). |

Le bonus de « personne » est posé comme un buff de run (`roomOnly: false`) : posé par salle, il aurait sauté à la première porte, et le défaut ne se serait vu qu'en salle 2.

### Les équipes

`CONTENT.pairs` déclare les attelages qui se connaissent : `{ char, pet, name, desc, petDamageMul, mods }`. Quand le personnage et l'animal choisis forment une paire, **les deux y gagnent** — l'animal frappe plus fort, le joueur reçoit les `mods`. C'est ce qui transforme « quel compagnon est le meilleur » en « quelle équipe est la meilleure ».

**Martin + Uno — Vieille complicité** : Uno mord 30 % plus fort, Martin va 8 % plus vite. Ils se connaissent, c'est son chien. Les deux autres équipes sont décrites en §34.

Le hub liste les équipes connues et coche celle qui est active ; la colonne Personnage rappelle l'attelage en cours.

### Planches d'un compagnon

Mêmes règles que pour un personnage, avec quatre clips : **repos**, **marche**, **attaque**, **blessé**. Un animal qui n'a que les deux premiers retombe dessus sans rien casser — c'est le cas courant, et il ne faut pas exiger la panoplie complète pour qu'un animal entre dans le jeu.

Un compagnon animé n'a **pas d'accessoire à son nom** : son badge de jeu et sa carte de boutique passent par la première image de sa planche de repos (`Pets.icon`, `Sprites.sheetCanvas`), sinon il n'apparaît qu'en pastille de couleur.

**Uno** (`pet_uno`) est le premier : le chien de Martin, quatre planches de 3 × 3 cases de 32 px — repos, marche, attaque, blessé — rôle « mord et attire les coups ». Choupi, Tanuki et ORI attendent encore leurs dessins (voir §34).

### Le partager

« Exporter » donne le contenu complet de **`dev/content5.js`** : les images en clair (data URI), puis les `CONTENT.pets.push(...)` et `CONTENT.characters.push(...)`. On colle le texte dans le fichier, on relance `node dev/build.js`, et les amis existent chez tout le monde — **rien à déposer dans `assets/`**, le dépôt se suffit à lui-même. Les images sont enregistrées au démarrage par `Sprites.loadFriends()`.

Les compagnons créés apparaissent dans l'onglet *Compagnons* de la boutique du hub (débloquer avec ses crédits, puis choisir celui qui part avec vous), et les élites peuvent en lâcher un en cours de run — celui-ci remplace le vôtre, il n'y a jamais qu'un **choix** de compagnon à la fois (un attelage compte pour un, voir §34).

Neuf gabarits restent lisibles dans `content.js` sous `petsExemples` : ils ne sont **pas** chargés, ce sont des exemples de réglages à recopier.

---

## 32. Dalles peintes une par une

Les deux animations de dalles acceptent `params.cells` — une liste de tuiles peintes — au lieu du rectangle `w × h`. **Le motif garde une seule partition** quel que soit le nombre de dalles : poser douze dalles ne fait pas douze lignes dans l'atelier.

Dans l'atelier, le pinceau « Dalles colorées » ou « Dalles qui montent » pose **une tuile par clic**, ajoute au motif choisi, et retire la dalle si on reclique dessus. Le glissé bouton enfoncé peint une traînée (il n'efface jamais : une tuile déjà peinte est simplement sautée). « Nouveau motif » ouvre un second groupe avec sa propre partition. Le même glissé marche pour le pinceau de terrain.

`AnimProp.eachCell` masque la différence : liste peinte si elle existe, rectangle sinon. Le damier et la vague se calculent sur les coordonnées de la tuile (`tx + ty`), donc un motif peint de travers garde un damier cohérent avec le sol.

---

## 33. Partitions longues, rythmes prédéfinis, objet mobile

### La partition n'est plus la fenêtre

Un niveau dure trois minutes ou plus ; une grille de deux mesures ne peut pas le décrire, et une grille de cent mesures est illisible. Les deux longueurs sont donc séparées :

- **Partition** (`bars`) : la longueur réelle du motif, de 1 à 128 mesures — 128 mesures à 129 BPM font près de quatre minutes. C'est ce que reçoit `beats.bars`, et les positions des coups sont **absolues** dans cette longueur.
- **Fenêtre** (1, 2, 4 ou 8 mesures) : ce que la grille montre. Elle coulisse dans la partition avec ◀ ▶, la règle reste numérotée en absolu (`5·1` = premier temps de la cinquième mesure), et le libellé dit où l'on est : *mesures 5–6 / 64*.

**La lecture boucle sur la fenêtre**, pas sur la partition : on repasse deux mesures en boucle au milieu d'un morceau de trois minutes. Case « boucler » décochée, c'est la fenêtre qui suit la musique.

Conséquence technique : une partition peut porter plusieurs centaines de coups, lus une fois par piège et par image. Le balayage linéaire (trois passages sur toute la liste) est remplacé par une **dichotomie** — `hitAround(hits, t, P, loop)` renvoie le dernier coup passé et le prochain. La durée d'activité étant la même pour tous les coups, si le dernier coup passé ne couvre pas l'instant, aucun plus ancien ne le couvre : un candidat de chaque côté suffit. Mesuré : 20 000 lectures sur une partition de 256 coups en 4 ms.

### Rythmes prédéfinis

Un menu **rythme** sur chaque ligne remplit la partition d'un coup : tous les temps, temps forts, temps 1 et 3, temps 2 et 4, croches, contretemps, doubles-croches, triolets, tresillo (3-3-2), clave 3-2, galop, charleston, montée, silence. Le motif est répété jusqu'au bout de la partition, quelle que soit sa longueur.

### Réglages avant la pose

Quand aucun élément n'est choisi, le panneau de réglages règle le **modèle du pinceau** (titre en cyan « Modèle : … »), et le prochain élément posé naît avec : couleur, rythme, durée, orientation, rayon, image… Un modèle par pinceau, gardé pour la session. Avant, il fallait poser puis régler, pour chaque objet.

### Objet mobile

Un décor qui **change de place**, sur un trajet tracé à la main. Chaque clic dans la salle ajoute un point (numéroté à l'écran, dans l'ordre du parcours), recliquer dessus l'enlève. À chaque coup de sa partition l'objet part vers le point suivant et met `active` temps à y arriver : c'est le déplacement qui joue en mesure, pas un clignotement. `pingpong` fait l'aller-retour au lieu de boucler, `spin` l'oriente vers sa direction de marche, et il porte n'importe quelle image du jeu. Comme tout le module d'animation, il n'a **ni collision ni dégât**.

### Le métronome tombait à côté

Mesuré : le clic arrivait **8 à 17 ms après le temps, systématiquement, jamais avant**. Il était déclenché au pas de simulation qui suivait le franchissement du temps — donc en retard d'une fraction d'image, toujours du même côté. Une horloge de métronome demande ±5 ms ; à ce régime elle « sonne faux » contre la musique.

Le clic est maintenant **programmé à l'avance pour l'instant exact du temps** : `Beat.timeToBeat(1)` donne les secondes restantes, et `AudioEngine` accepte `delay` — l'instant visé, pas un supplément. Écart mesuré après correction : **0 ms**.

L'horloge elle-même n'était pas en cause : mesurée sur 25 s de lecture bouclée, elle suit la piste à moins de 21 ms, sans dérive, sans repli sur le métronome interne et sans saut.

### Décalage son/image

Ce que l'oreille entend à un instant donné a été envoyé à la carte son un peu plus tôt : l'image est donc en avance sur le son de cette latence, qui dépend de la machine, du casque et du navigateur. Le réglage **décalage** (en ms) de l'atelier retarde l'horloge d'autant, se règle à l'oreille contre le métronome, et est gardé dans le profil — il s'applique aussi en partie. Le clic du métronome, lui, est avancé de la même valeur pour rester sur le temps entendu.

À savoir : avec un décalage positif, les *autres* sons calés sur les temps (annonces de pièges, avertisseurs) partent d'autant plus tard, puisqu'ils sont déclenchés par l'horloge et non programmés à l'avance. C'est tolérable sur un effet, ça ne l'était pas sur un métronome.

---

## 34. L'attelage inséparable, les trois équipes, les personnages en attente

### Un compagnon qui vient à deux

Choupi et Tanuki ne se quittent pas. Les déclarer comme deux compagnons séparés aurait donné le choix de n'en prendre qu'un, ce qui n'a pas de sens pour eux ; les fondre en un seul animal aurait perdu leurs deux rôles. La réponse est un **attelage** : un choix, deux animaux.

Trois champs suffisent, tous sur le meneur sauf le dernier :

| Champ | Sur qui | Ce qu'il fait |
|---|---|---|
| `duo` | le meneur (`pet_choupi`) | l'identifiant de l'inséparable |
| `duoName` | le meneur | le nom affiché du couple — « Choupi & Tanuki » |
| `hidden: true` | le second (`pet_tanuki`) | il n'apparaît pas en boutique : il ne s'achète pas seul |

`Pets.give` crée les deux d'un coup, `Pets.title` affiche `duoName`, `Pets.setMode` pose le mode sur les deux, et `Pets.clear` les emmène ensemble. Ils arrivent ensemble, se reposent ensemble, reviennent ensemble en mode « à l'appel ».

### Ce que ça a changé dans le moteur

L'état des compagnons était une seule référence, `G.pet`. Il est devenu **`G.pets`, une liste**, avec `G.pet` conservé comme raccourci en lecture sur le premier — c'est ce qui a permis de ne pas réécrire tout ce qui interroge « le compagnon ». Ce qui **balaie** les compagnons a été repris pour parcourir la liste : le rendu, le tri en profondeur avec les ennemis, le badge de HUD, les dégâts encaissés, les modes, le repositionnement au changement de salle.

Une équipe se déclare toujours sur le **meneur** — `Content.pairOf` regarde `G.pets[0]` — puis `Pets.applyPair` en distribue le bonus aux deux. Déclarer une paire sur `pet_tanuki` ne produirait rien.

### Les trois équipes

| Équipe | Le duo | Ce qu'elle donne |
|---|---|---|
| **Vieille complicité** | Martin + Uno | Uno mord 30 % plus fort, Martin va 8 % plus vite |
| **La maisonnée** | Gabriel + Choupi & Tanuki | les deux chats frappent 30 % plus fort, Gabriel gagne 15 % de crédits |
| **Œil pour œil** | Jean + ORI | Jean tape 10 % plus fort sur ce qu'ORI a désigné |

Le bonus d'une équipe vaut pour **tout** l'attelage : Choupi et Tanuki reçoivent chacun le multiplicateur, sinon prendre un duo reviendrait à diluer le bonus par deux et l'attelage serait un mauvais choix par construction.

### Les rôles des trois chats

- **Choupi** (`collect`) — il rapporte : tout ramassable dans son rayon vient à vous.
- **Tanuki** (`charge`) — il traverse en ligne droite et fait mal au passage.
- **ORI** (`mark`) — il ne frappe pas, il désigne : la cible marquée encaisse 30 % de plus, de votre part comme de celle des autres.

### Les trois personnages de l'auteur

Martin, Gabriel et Jean ont chacun leurs cinq planches — repos, marche, tir, ramassage, mort —, toutes en cases de 48 px, toutes affichées à 96. Mesurés côte à côte : **38 × 88**, **40 × 86**, **42 × 88**, et le bas du dessin au même pixel pour les trois. C'est cette cohérence-là qui compte, bien plus que le nombre d'images : trois dessinateurs de silhouettes différentes auraient donné trois hauteurs, et le jeu aurait eu l'air bancal sans qu'on sache dire pourquoi.

| | qui c'est | son équipe |
|---|---|---|
| **Martin** | chemise rose, cravate verte, lunettes, barbe | Uno — *Vieille complicité* |
| **Gabriel** | capuche noire, chignon, lunettes | Choupi & Tanuki — *La maisonnée* |
| **Jean** | cheveux longs, barbe, t-shirt blanc | ORI — *Œil pour œil* |

Plus aucun personnage n'emprunte de sprite : le champ `placeholder` a disparu du contenu, des personnages comme des animaux.

Les prompts pour fabriquer ces planches sont dans **`PROMPTS-SPRITES.md`** : un prompt global de style, puis un prompt court par clip, pour les humains (case de 48) comme pour les animaux (case de 32).

### La compétence ne partait plus

Dans la branche clavier/souris de `Player.update`, l'affectation de `wantSkill` avait glissé **à l'intérieur du commentaire** de la ligne au-dessus. Résultat : la compétence ne se déclenchait plus ni à Espace ni au clic droit, sur toute la version bureau — le tactile, qui a sa propre branche, marchait toujours. Rien ne le signalait : pas d'erreur, pas de son, juste une touche morte. Les deux affectations sont maintenant sur deux lignes distinctes.

---

## 35. Les habits évolutifs, abandonnés

Le personnage se rhabillait au fil de la run : nu jusqu'à deux greffes (avec une mosaïque de floutage), vêtements de route à trois, l'armure du sprite sans le casque à six, le chevalier complet à neuf. C'était joli sur le papier et coûteux à dessiner — quatre tenues par personnage, à multiplier par chaque copain à venir. **Abandonné : les personnages sont habillés dès la première salle.**

Ce qui disparaît : `Sprites.bodyTier`, l'option `tier` de `drawBody`, le palier `nu` et sa mosaïque, le sélecteur *Tenue* du panneau de débogage et `G.debug.forceTier`.

Ce qui reste, et qui suffit — `drawBody` choisit désormais entre trois choses, sans palier :

| Ce que porte le personnage | Ce qui est dessiné |
|---|---|
| une planche d'animation (`anim`) | la planche, c'est le cas de Martin |
| un sprite entier (`body`) | l'image de l'auteur, posée sur la ligne de sol |
| un visage (`face`) | le corps de la planche à partir du cou, surmonté du visage |
| rien de tout ça | la planche de sprites du jeu, entière |

Le cas du **visage** est le seul qui garde le corps dessiné : la planche complète recouvrirait la tête, et le copain perdrait ce qui le rend reconnaissable. Il reçoit donc le corps de la planche coupé sous le cou — la même tenue que les autres, simplement décapitée pour laisser la place. Le corps dessiné en pixels ne sert plus que de secours, tant que la planche n'est pas chargée, et il est habillé lui aussi.

Le portrait du hub suit la même règle : il montre le personnage tel qu'il entrera en salle 1, plus un corps nu.

### Les deux cases vides du bout de planche

PixelLab rend une planche de 7 images dans une grille 3 × 3 : les deux dernières cases sont vides. Comptées comme des images — ce que faisait `addSheet`, qui posait `n = colonnes × lignes` —, le personnage disparaissait **deux temps sur neuf** à chaque boucle, un clignotement discret mais permanent.

`framesOf` remonte donc la grille depuis la fin et s'arrête à la dernière case dessinée. Seules les cases vides **de fin** sont retirées : une case vide au milieu d'une planche est une image voulue (un clignotement, une disparition), et la couper décalerait tout ce qui suit. Les planches déjà en place qui remplissent leurs neuf cases ne bougent pas.

### L'arme sortait de l'entrejambe

L'arme était dessinée à une hauteur **fixe**, 23 px au-dessus de la position du joueur. Ce chiffre avait été calé sur le seul corps qui existait alors, celui dessiné en pixels. Les planches de l'auteur font 88 px là où ce corps en faisait 72, et la planche du jeu 60 : à hauteur fixe, l'arme tombait au bas du ventre des grands et à la hanche des petits.

`Sprites.handY` la place maintenant à **45 % du corps au-dessus des pieds**, et chaque façon de dessiner un corps y déclare sa propre ligne de sol et sa propre hauteur — une planche de l'auteur pose ses pieds à `y + 25` et mesure `taille × foot`, la planche du jeu s'arrête à `y + 20` et ne remplit que ~72 % de sa case. Mesuré après correction : 45 % pour Martin, 46 % pour Gabriel, 45 % pour Jean, 44 % pour Neuf — c'est-à-dire la main, pour les quatre.

C'est la même leçon que les deux cases vides : tout nombre écrit en dur pour *un* corps devient faux dès qu'un deuxième arrive.

### Les trois chats, et la ligne de sol des animaux

Choupi et Tanuki (les chats de Gabriel) et ORI (le chat de Jean) ont chacun leurs quatre planches — repos, marche, attaque, blessé. Les deux premiers sont dessinés en cases de **48 px**, ORI et Uno en cases de **32 px**. Chacun est affiché à **×2 de sa case** (96 et 64) : c'est ce qui garde le même grain de pixel pour tous, et c'est la seule règle qui compte. Conséquence assumée par l'auteur : Choupi et Tanuki (68 px) sont plus grands qu'Uno (52 px). Les réduire à ×1 les mettait à 34 px avec un grain deux fois plus fin que le reste — l'auteur a préféré leur taille naturelle.

En les posant côte à côte, un défaut est apparu : la ligne de sol d'un compagnon était **proportionnelle à sa taille** (`y + taille × 0,34`). Un chat de 32 posait ses pattes 11 px au-dessus de celles d'un chien de 64 placé au même endroit, et tous flottaient au-dessus de la ligne du joueur (`y + 25`). Un animal dessiné par une planche prend maintenant la ligne de sol du joueur, ombre comprise.

Et une seconde erreur, que j'ai d'abord validée à tort : l'option `foot` de `drawSheet` portait un `− dh/2` de trop, si bien que le **dessin** se retrouvait une demi-case au-dessus de son ombre — pattes d'Uno à y−8, des chats à y−24, ombres à y+31. Mon test mesurait la boîte de tout ce que `Pet.render` dessine, ombre comprise, et concluait « à 3 px près » sur l'ombre. Le seuil alpha du test est passé à 200 (l'ombre est à 82) : mesuré ensuite, pattes d'Uno, Choupi et Tanuki à **y+24**, pieds de Martin à y+24, ORI 15 px plus haut parce qu'il vole. La leçon vaut pour tous les tests d'image : **dire ce qu'on mesure**, et ne pas laisser une ombre passer pour des pattes.

---

## 36. Chantier 1 — ce que les amis voient à leur première partie

Sept corrections, toutes petites, toutes visibles.

- **La mort se joue.** `Player.render` s'arrêtait dès `dead` : les planches de chute de Martin, Gabriel et Jean n'étaient jamais dessinées et l'écran de fin tombait sur un personnage disparu. Le corps reste et joue son clip (sans arme, sans aura, sans clignotement) ; `Run.onPlayerDeath` attend la durée de la planche plus 0,35 s avant d'afficher l'écran de fin — sauf pour le bot, où rien n'attend. Un personnage sans planche de mort disparaît comme avant.
- **Le portrait du hub montre la planche.** `portraitBody` reçoit `anim` et dessine le repos à ×3 de la case (48 → 144 px), pixels carrés, en respirant. Sans ce cas, Martin s'affichait en chevalier orange.
- **Se baisser, seulement pour un vrai objet.** `Combat.collect` n'excluait que les pièces : chaque orbe d'XP courbait le personnage 0,57 s et coupait le tir à chaque kill. `PICK_CLIP_KINDS` = bourse, cœur, relique, arme, allié, compagnon.
- **« Personne » ne se cumule plus.** `Pets.give` retire le buff `solo` : un compagnon ramassé en route annule la part gardée.
- **F2 en mode test seulement.** Un ami qui tâtonne les touches tombait dans l'éditeur de niveau.
- **Les mots de l'ancien lore sont partis** des libellés (`STR`), des phrases du hub, d'entrée de palier, de mort, de boss, du synopsis, de l'écran de fin, du malus « Protocole d'urgence » (devenu « Peau fine ») et des descriptions de biome et de boss. Les *fragments* (onglet du hub) racontent encore l'ancienne histoire : c'est un autre chantier, ou une décision.
- **Neuf et Marge sont retirés** du contenu. Leurs traits — *Tolérance tissulaire* (+15 % XP, +2 chance, soin par salle) et *Connaissance du Site* (pièges −50 %, fragments ×2) — sont à attribuer à deux amis au chantier 5. `Content.character()` retombe désormais sur Martin.

Tests : `mort.js` (la chute dessinée, l'écran de fin retardé, le clip « ramasse ») et `premiere_partie.js` (les mots bannis, le portrait, F2, « Personne », Neuf et Marge).

## 37. Chantier 2 — la sauvegarde et la vie privée

- **Une sauvegarde versionnée** (SCHEMA.md §8) : `way_save`, version 2, migration par saut, fusion profonde, copie de secours avant toute transformation, ancienne clé relue. Mesuré avant : un profil `{v:2, coins:999}` devenait `coins: 0` sans avertissement, un `volume: { master }` perdait `sfx` et `music`. Test : `sauvegarde.js`.
- **`Rapport`** (00_core.js) : toute erreur non rattrapée (`error`, `unhandledrejection`) est notée dans `way_journal` avec la salle et l'état, un toast le signale (au plus un toutes les 10 s), et « Copier le rapport » — dans la pause et sur l'écran de fin — met dans le presse-papiers version, navigateur, écran, profil, partie en cours et journal. `build.js` écrit `window.WAY_BUILD` pour que la version soit lisible. Test : `rapport.js`.
- **Les photos ne partent qu'avec l'accord.** L'export de l'établi Amis compte les images importées (visages, sprites entiers) et demande l'accord des personnes avant de les embarquer dans un fichier public ; refusé, l'export part sans elles (les planches dessinées partent toujours) et le dit en tête du texte. Un champ **pseudo** sur chaque copain remplace le prénom dans le fichier exporté, s'il est rempli. Test : `export.js`.

## 38. Chantier 3 — un corps, une ligne de sol

**Le descripteur.** `Sprites.corps(key, opts)` renvoie trois nombres depuis le point d'ancrage `(x, y)` d'une entité : `sol` (les pieds sont à `y + sol`), `hauteur`, `main` (la main est à `y + main`). `Sprites.SOL = 25` pour tout le monde : joueur à planche, sprite entier, visage collé sur le corps de la planche, planche du jeu, compagnon à planche ou à image. L'ombre, l'arme (`handY` n'est plus qu'une lecture), et l'ordre de dessin lisent ce descripteur et rien d'autre. Avant, six façons de dessiner un corps avaient chacune leur ligne de sol — mesuré : pieds du joueur à y+25, ceux de la planche du jeu à y+20, un visage collé à y+33, un compagnon à image à y+29, un compagnon à planche à y−8.

**Mesurer, pas deviner.** La planche du jeu ne remplit pas sa case : `spriteBornes(key)` lit une fois où le dessin commence et s'arrête dans la case du sprite (le chevalier laisse 8 rangées vides **en haut**, aucune en bas — l'inverse de ce que j'avais supposé), et `spriteDecalage` en déduit de combien décaler `draw()` pour que les pieds tombent à `y + SOL`. Le visage collé coupe le corps de la planche sous le cou **et** à ses vrais pieds.

**Le corps regarde où il vise.** Le retournement suit `aim`, plus le déplacement : on tirait à droite avec le dos tourné. Une planche n'a qu'un profil (décision : pas de nord/sud), un sprite à trois vues choisit la sienne d'après la visée. Blessé : trois pixels de recul le temps du flash.

**Un geste de tir par tir réel.** `Player.tir(intervalle)` est appelé aux trois endroits où un tir part vraiment ; le clip tient dans l'intervalle entre deux tirs (borné 0,15–0,6 s), ses images réparties dessus (`opts.fps` sur `drawBody`). Avant, un geste fixe de 0,5 s courait tant que le bouton était tenu : deux balles de pistolet par geste, deux gestes et demi par coup de marteau. Le dash s'anime (le personnage court) au lieu de figer le clip.

**Ordre de dessin par les pieds, joueur compris.** `90_main.js` trie ennemis, compagnons **et** joueur par `feetY()` ; le joueur était toujours dessiné en dernier, un chat devant lui passait derrière.

**Ménage.** Le corps dessiné en pixels et `BODY_PALETTES` (atteints seulement sans tileset), `Sprites.portrait()` (zéro appelant), `hold` sur `death`, `walkFrame` : supprimés. `gait` respire sur `Time.now` (figé en pause). Les vignettes (`sheetCanvas`) sont à un multiple entier de la case ou à sa moitié exacte, jamais ×0,71. `readSheet` devine la case de chaque planche et **refuse** une planche d'une autre case au lieu de la découper de travers.

Test : `corps.js` — 23 mesures : les trois personnages, un sprite entier, un visage collé, la planche du jeu, les quatre animaux et un compagnon à image posent tous les pieds à y+25 ; le descripteur dit la bonne hauteur ; l'ordre de dessin ; le regard ; un geste par tir ; le dash animé.

## 40. Chantier 5 — des compagnons qui comptent

**Les trois modes sont un choix.** « Personne » valait +12 % de dégâts et +20 PV : personne ne le prenait. Il vaut maintenant **+35 % de PV max et +20 % de dégâts** (`PET_MODES.none.mods`, en multiplicateurs pour suivre les greffes). Mesuré au bot (TEST-REPORT §12) : à +25 %/+15 %, 1 victoire sur 8 contre 3 avec Uno ; à +35 %/+20 %, 3 sur 16 et le mini-boss une fois sur deux. Ça reste le mode dur pour le bot, qui n'esquive pas et à qui Uno épargne 200 à 600 dégâts par partie ; pour un joueur qui esquive, la part gardée pèse plus. Aller plus haut ferait du solo le meilleur choix pour lui — on s'arrête là et on écoute les amis. « À l'appel » ne se contentait pas d'arriver : **son arrivée est une onde de choc** autour du joueur (`PET_MODES.call.arrival` → `Combat.playerShockwave`), ce qui en fait un bouton de secours quand on est encerclé, avant même les 12 s de force. Le bot d'équilibrage appelle son compagnon dès qu'un ennemi est à 320 px et que l'appel est disponible (`botControl`), et le banc prend `MODE=always|call|none`.

**Choupi va chercher.** `collect` aimantait passivement dans un rayon de 220 px autour d'un animal qui suivait le joueur : autant dire le rayon de ramassage du joueur, un peu plus loin. Maintenant le rapporteur **court vers le ramassable le plus proche** (dans `radius` = 260 px de lui, sans s'éloigner du joueur de plus de `leash` = 320 px) et tout ce qui passe à `reach` = 140 px de lui file vers le joueur. Tant qu'il est en course, un anneau pointillé au sol montre sa portée (`renderReach`). Fragments, armes, reliques, alliés et compagnons ne sont jamais aimantés (`NO_MAGNET`) : on les ramasse en se baissant.

**ORI rend critique.** `mark` multipliait les dégâts de tout le monde par 1,3 sur la cible désignée — invisible, et 30 % ne se sent pas. Avec `markCrit: true`, **chaque coup du joueur sur la cible marquée est un coup critique** (`Combat.hitEnemy` : `e.markCrit && e.markUntil > Time.now` force `crit`), en plus des 30 %. Avec un critique à ×1,5, la cible marquée tombe ×1,95 plus vite de la main de Jean — c'est ce que promettait déjà « Œil pour œil ». La marque se voit : un anneau aux pieds de la cible et un losange au-dessus de sa tête, aux couleurs du chat, avec une petite jauge la dernière seconde (`renderMark`). Les compagnons qui mordent ou crachent passent en `noCrit` : la marque ne les concerne pas.

**Un caractère par ami.** Les traits de Neuf et Marge, retirés au chantier 1, reviennent sur les amis avec de nouveaux noms, à réattribuer par eux (voir PLAN-CHANTIERS §5) :

| Ami | Caractère | Ce que ça fait |
|---|---|---|
| Martin | **Bonne constitution** | +10 % de PV max soignés au début de chaque salle, +15 % d'expérience, +2 de chance |
| Gabriel | **Pied sûr** | pièges ÷2, fragments ×2, sprint de 2 s (×1,2) quand un piège le touche |
| Jean | **Sang-froid** | +10 % de chance de critique, critiques +25 % (nouveau) |

L'atelier « Amis » propose les trois dans la liste des caractères (`TRAITS`, avec leurs `hooks` — avant, l'atelier n'exportait jamais de hook).

**Des reliques hors élites.** Un ennemi ordinaire lâche une relique à 2 % (`BALANCE.relicDropChance`, toujours sous le plafond de 2 objets par salle), et **le mini-boss en lâche toujours une** (`BALANCE.relicOnBoss`, dans `Room.onBossDefeated`). Avant, seules les élites (35 %, un quart du temps une relique) en donnaient : une partie entière pouvait n'en voir aucune.

**Une seule remise à zéro.** `Run.reset()` efface ennemis, compagnons, salle, tirs, ramassables, particules et chiffres flottants ; `Run.start` et `Run.toHub` l'appellent. Avant, `toHub` oubliait les compagnons et les particules : un chat fantôme pouvait réapparaître au hub, et les `snap()` de `Room.load` restent parce qu'ils **placent** (ils ne nettoient pas).

Test : `compagnons.js` — 17 mesures : les deux bonus de « Personne » ; l'onde d'arrivée touche à 60 px et pas à 400 ; Choupi court vers une pièce à 234 px, dessine son anneau et la pièce finit ramassée ; ORI marque avec `markCrit`, 20 coups sur 20 sont critiques, 43 sur 200 sans la marque, le losange se dessine ; les trois caractères ; 12 reliques sur 600 ennemis ordinaires, une sur le mini-boss ; le retour au hub ne laisse rien.

## 41. Chantier 6 — choisir plutôt que subir

**Le tempo est un geste.** La fenêtre « en rythme » passe de ±100 ms à **±50 ms** (`BALANCE.tempo.window`), et le bonus ne commence qu'à **une série de 4** (`BALANCE.tempo.minStreak`) : les trois premières notes construisent une jauge de quatre pastilles sous la barre de mesure (`Tempo.renderStreak`), la quatrième affiche « TEMPO ×n » et donne ×1,35, puis +0,025 par note jusqu'à ×1,5. Surtout, **une action hors du temps est une fausse note** : la série retombe à zéro (un petit « fausse note » gris quand on perd une série de 4 ou plus). Avant, ±100 ms sur un temps de 465 ms couvrait 43 % du temps, et tenir le bouton d'un pistolet enchaînait les séries sans le vouloir : le bot avait 38-53 % de tirs bonifiés. Mesuré maintenant : **0 tir bonifié sur 301** pour le bot au pistolet, qui tient le bouton. Un joueur qui tape sur le temps garde tout. Le bonus d'XP de fin de salle (`onBeat × 4`) ne compte plus que les notes d'une série de 4 ou plus.

**Trois compétences, deux paires.** La prépa propose **trois** compétences (`G.run.skillChoices`) au lieu de deux, et **deux paires bonus/malus** (`G.run.pairChoices`, tirées parmi les `levelPassives` du biome) présentées comme une étape 0 « Ton départ » : cliquer une paire l'applique aussitôt (`Run.setPair(i)` → `G.player.recompute()`), la première est prise par défaut. La fiche de niveau du hub le dit : « deux de ces paires te sont proposées, tu en choisis une ».

**Une greffe par effet.** 74 → **61** greffes. Retirées, absorbées par une autre (`UPGRADE_ALIASES` dans `10_content_api.js`, `Content.upgrade(ancienId)` renvoie la nouvelle) :

| Retirée | Absorbée par | Comment |
|---|---|---|
| Munitions | Tranchant | dominée (dégâts + cadence en petit) |
| Calibrage | Longue portée | portée +15 % **et** projectiles +15 % |
| Aimant de poche | Tirelire | +20 % pièces **et** ramasse 30 px plus loin |
| Projectiles lourds | Frappe lourde | +15 % zone, +20 % recul en plus |
| Balles incendiaires / givrantes / électriques | Étincelle / Givre / Chaîne éclair | la chance suit le palier (15 → 30 → 45 %, 20 → 40 → 60 %) |
| Conducteur | Chaîne éclair | idem |
| Double canon | Double canon (ex-Second canon) | le nom reste, la version dominante (−12 % au lieu de −25 %) |
| Satellite, Ceinture d'astéroïdes, Noyau | Orbes gardiennes | 2 paliers : 2 puis 4 orbes |
| Tempête | Foudre ambiante | 2 paliers |

La greffe « Sang-froid » s'appelle **Nerfs d'acier** : Sang-froid est le caractère de Jean. `Combat.hitEnemy` multiplie la chance d'un effet `onHit` par ses paliers (`h.stacks`), de même `coin_on_kill` et `skill_reset_on_kill` — avant, reprendre Étincelle ne changeait rien. `dev/check-greffes.js` vérifie qu'aucune greffe n'en domine strictement une autre **de la même rareté** (mêmes stats au moins aussi bonnes, mêmes effets au moins aussi probables, aucun malus en plus) : 0 dominance. Une rareté supérieure a le droit de dominer une inférieure, c'est le palier (Salve > Double canon, Mitraille > Tir guidé).

**Les calibrations disent vrai.** Mémoire sélective, Aperçu du coffre et Quatrième choix vendaient trois paliers chacune ; seul le premier faisait quelque chose, et Mémoire sélective ne faisait pas ce que sa fiche promettait. Chacune n'a plus qu'**un palier au prix du premier**, avec une fiche honnête (§5). Sauvegarde **v3** : la migration rembourse les paliers 2 et 3 payés (80 + 150, 70 + 130, 100 + 170) et ramène le palier à 1.

Test : `choix.js` — 17 mesures : la fenêtre, les trois notes muettes puis le bonus, la fausse note, la note à 40 ms, la jauge, le bot à 0 % ; trois compétences, deux paires, la seconde paire posée et gardée en salle 1 ; 61 greffes sans doublon de nom, les anciens ids résolus, Étincelle ×3 à 45 %, Nerfs d'acier, `check-greffes` ; un palier par calibration fictive, la migration v2 → v3 et son remboursement.

## 39. Chantier 4 — le Normal gagnable

**La mesure.** `dev/test/bench/normal.js` fait jouer le bot en mode Normal, profil neuf, Martin + Uno, 8 armes × 4 graines, et sort victoires, mini-boss tué, salle médiane, pire salle, et ce qu'Uno encaisse. Ce n'est pas un test : c'est la mesure qu'on refait avant et après chaque réglage. Le bot est plus faible qu'un humain (il esquive les télégraphes et les tirs, mais marche dans les sols électrifiés) : 25 % de victoires bot ≈ 35-40 % humain.

**Avant** : 0 victoire sur 32, mini-boss tué 6 %, salle médiane 3, pire salle 206 s, Uno KO 3,5 fois par partie.

**Les réglages, dans l'ordre où ils ont été mesurés** (tout est dans `05_balance.js` ou dans le contenu, rien dans le moteur) :

1. **Armure en pourcentage** — 1 point = 4 %, plafonné à 50 % (`BALANCE.armor`). En retrait fixe, trois greffes ramenaient tout coup du biome 1 à 1 point.
2. **L'arc tire à pleine charge si on tient** — un débutant (et le bot) qui garde le bouton enfoncé ne tirait jamais : mort en salle 1.
3. **Renforts des zones à capturer plafonnés à 3 vagues** (`BALANCE.reinforcementWaves`) ; ensuite la porte s'ouvre, zones abandonnées, pas de prime. Le bot restait 378 s en salle 2.
4. **Coffre** : épique garanti dès 0,7 de qualité (0,85 avant), colossal à 0,97 (0,999 : pour le bot seulement).
5. **Prime de mort** 30 + 10 par salle (`BALANCE.deathBonus`), en plus des 10 % par salle des crédits en attente ; **prix des calibrations et des armes divisés par 3**. Mourir en salle 3 rapportait 18 à 42 crédits pour un total de 12 670.
6. **Uno** : 150 PV (90), sonné 5 s (6), se soigne de 8 PV/s après 4 s sans coup, et tout compagnon encaisse 70 % des dégâts de contact (`BALANCE.petRegen`). Ressenti par l'auteur : « sa vie baisse trop vite » — mesuré : KO 3,5 fois par partie → 0,8.
7. **Courbe du biome 1** : PV ×0,85, dégâts ×0,75, rampe par salle 0,06 (0,09 ailleurs) — dans la définition du biome, pas dans le moteur.
8. **Un cœur (30 PV) devant la porte à chaque salle vidée** (`BALANCE.heartOnClear`), et 5 % de cœurs sur les ennemis (3 %). C'était la seule chose qui manquait pour arriver au mini-boss autrement qu'à 40 PV : sans Neuf, plus personne n'avait de soin par salle.
9. **Le Portier** : 2600 PV (3300), recharges de ses quatre attaques +30 %, dégâts −20 %. Elles se chevauchaient et chacune coûtait un quart des PV.
10. **Second souffle** : un cœur tombe au changement de phase d'un boss (`BALANCE.heartOnBossPhase`).
11. **Les salles de boss ne sont pas rampées** : la rampe (×1,24 en salle 5, ×1,48 en salle 9) s'ajoutait à un boss réglé à la main pour sa salle — elle annulait toute baisse de ses dégâts, et gonflait la revanche du biome 4 à 12 500 PV. C'est le réglage qui a fait passer le mini-boss de 38 % à 81 %.

**Après** (32 parties, 8 armes × 4 graines) : **13 victoires (41 %), mini-boss tué 22 (69 %)**, salle médiane 7, pire salle 113 s, Uno KO 1,1 fois. Par arme : chaîne 4/4, boomerang 3/4, lame, arc et pistolet 2/4, marteau, orbe et brûleur 0/4 — l'orbe et le brûleur ne dépassent pas la salle 6 : c'est un écart entre armes, pas de courbe, à traiter avec les greffes au chantier 6. Le mur suivant est la salle 6 (modulaire) : le bot y marche dans le sol électrifié et l'arc y tourne parfois en rond ; un humain lit un sol qui clignote — à revoir au chantier 9 avec les salles modulaires.

**Biomes 3 et 4** : non retouchés au-delà de la rampe des salles de boss, faute de mesure ; à mesurer (`BIOME=biome_3 PROFIL=test node normal.js`) au chantier 9.

## 42. Chantier I-1 — ce qui était cassé ou faux (interface)

Premier chantier du plan des interfaces (`PLAN-INTERFACES.md`), tiré des deux audits (`AUDIT-MENUS.md`, `AUDIT-HUD.md`). Rien de la logique de jeu ne bouge.

**Menus.** Les cinq onglets de la boutique tiennent dans le cadre (`.tabs` replie) ; l'onglet des compétences s'appelle « Compétences » ; la prépa n'a plus de trou à gauche ; les colonnes du hub sont à 93 % d'opacité et la scène d'attraction est **figée** derrière (`Attract.freeze`) — un piège ne barre plus trois cartes ; planchers de police à 12 px (11 pour une étiquette) partout, et 44 px de haut pour les onglets au doigt ; les lignes « Tenue », « calibration(s) », « Phase 2 », « case(s) cochée(s) » ont disparu ; « Master » → « Général ». **Un profil neuf part avec Uno.**

**Écran de fin.** La ligne « Crédits en attente conservés (10 % de 0) » était fausse depuis le chantier 4 (la prime de mort n'y était pas dite) : elle devient « Butin ramené — prime de mort + une part des N crédits en attente ». La ligne « Salles » (du journal, pas un bilan) est partie. Un bouton **« Rejouer — Martin + Uno, Admission »** relance la même équipe, la même arme et la même compétence en salle 1 sans passer par le hub.

**HUD.** Réécrit autour de `panel()` et `label()`, **ancré sur `Engine.view`** : sur un téléphone, la barre de PV touche enfin le bord et le cartouche d'arme est en bas de l'écran, plus au milieu du terrain. Sortis du HUD : qualité de run et de salle, coups, prédiction de coffre, jauge de qualité, cartouche crédits, stats d'arme, bandeau des greffes, rappel des touches après la salle 3, « métronome interne » — environ 60 % des pixels de texte. Le cartouche central ne dit plus que « Salle 3/9 — Combat · 12 s », dans une boîte à la taille du texte. PV : vert, doré, puis **rouge seulement sous 30 %**, avec pulsation et vignette rouge en périphérie. « Niveau n » est dans le panneau des PV. La barre du boss est en haut au centre, à la place du cartouche, avec « PRISE EXPOSÉE » sous la barre ; son nom n'est plus aussi un bandeau. Un seul compteur de série : les pastilles sous les pieds du joueur (`Tempo.renderPlayer`) puis « TEMPO ×n » en chiffre flottant ; plus de « SÉRIE ×n » en bandeau ni de « TEMPO » en haut. Métronome en disques de 12 px sans boîte opaque. Bandeaux au tiers supérieur, toasts en bas à droite (au-dessus des boutons tactiles). Badge du compagnon aligné sur le cartouche d'arme (même bord, même largeur), avec la vie d'Uno dedans.

Tests : `interface.js` (18 mesures) et `interface_mobile.js` (7 mesures), voir `dev/test/README.md`.

## 43. Chantier I-2 — un seul vocabulaire

**Le glossaire** (un mot par notion, partout, et le test `vocabulaire.js` le tient) :

| Notion | Le mot | Jamais |
|---|---|---|
| le biome (Admission, La Serre…) | **palier** (« Palier 1 · ADMISSION ») | niveau |
| le niveau d'expérience | **niveau** (« Niveau 3 ») | — |
| ce qu'on achète au camp entre deux parties | **amélioration** | calibration, passif |
| ce qu'on prend en partie à une montée de niveau ou dans un coffre | **greffe** | amélioration, upgrade |
| l'argent | **crédits** ; mis à l'abri en salle 4 = **en banque** ; pas encore à l'abri = **en attente** | consigné, validé |
| une partie | **partie** | run |
| mourir | **mort** ; la seconde chance = **seconde vie** | réimpression |
| le coffre de greffes | **Coffre** | Réserve de greffes |
| la compétence d'esquive | **Ruée** | Dash |
| le camp | **camp de base**, « Retour au camp » | hub (dans les textes ; le code garde `hub`) |

**Une voix** : le jeu **tutoie**, partout — titres, descriptions d'armes, de compétences, de greffes, d'améliorations, d'ennemis, de boss, de pièges, de compagnons, modes de compagnon, phrases du camp et de la mort. Le vouvoiement n'existe plus dans un texte affiché.

**Sans unité de moteur ni anglais** : plus de « px », de « DPS », de « ticks/s », de « cooldown » (→ recharge), de « dash » (→ ruée), de « pickups » (→ ce qui traîne), de « spam », de « dmg », de « kill » (→ ennemi tué). Les distances deviennent des repères humains, avec une table unique : ≤ 90 px **à bout portant**, ≤ 200 **de près**, ≤ 350 **à mi-salle**, ≤ 500 **loin**, au-delà **toute la salle** (la salle fait 1152 px de large). La recharge d'une compétence n'est dite que dans son étiquette (« recharge 9 s »), plus dans la description. Les catégories de greffes et les familles d'armes ne sortent jamais telles quelles du contenu : `CATEGORIES` et `FAMILLES` dans `50_ui.js` les traduisent (Attaque, Défense, Mobilité, Butin, Spécial, Synergie ; lame, masse, arc, pistolet, boomerang, orbe, chaîne, flamme).

**Relecture** : les 8 armes, 8 compétences, 61 greffes et 16 améliorations tiennent en 90 caractères au plus ; les tableaux §4 et §5 sont régénérés depuis le contenu.

**Ce qui reste volontairement** : les fragments de l'ancienne histoire (onglet Fragments, `LORE.fragments`) gardent leur vocabulaire — leur sort (supprimer ou réécrire avec l'histoire de WAY) est une décision à part, et le test les exclut. Les identifiants du code (`skill_dash`, `cooldown`, `Pickups`, `hub`) ne changent pas : le glossaire est celui des textes affichés.

Test : `vocabulaire.js` — 6 mesures : 401 textes du contenu, les écrans rendus (menu, hub et ses quatre onglets, prépa, pause, montée de niveau, HUD, fin) et les 91 messages écrits dans le code passés à la liste des mots bannis ; « palier », « Ruée », « Coffre » ; aucune description au-dessus de 90 caractères.

## 44. Chantier F-1 — le vocabulaire et l'impact (ressenti)

Premier chantier du plan du ressenti (`PLAN-RESSENTI.md`, direction « La Voie bat »), tiré de l'audit `AUDIT-FEEL.md`. Aucune règle de jeu ne bouge.

**Le vocabulaire** (`00_core.js`) : `Ease` — `outCubic`, `outQuad`, `inQuad`, `outBack` (dépasse à 1,10 : le pop), `outElastic` ; `Feel` — `stop(ms, force)` (arrêt sur image : `Time.slow = 0,02`), `slow(scale, ms)`, `shake(mag, angle, ms)`, `pop(e)`, `squash(e, angle)`, `tick(e, dt)`, `popK(e)`, `squashK(e)`. Cinq mots aux valeurs fixes : pop 120 ms 1 → 1,25 → 1 ; squash & stretch à l'impact +30 % / −22 % en 110 ms ; flash 60 ms plein puis 70 ms à 35 % ; hitstop 30 / 70 / 60 / 180 ms (coup / critique / mort / phase de boss) ; trail 5 fantômes. Pas de bibliothèque : un tween externe ignorerait le pas fixe et le ralenti du moteur.

**L'arrêt sur image.** `Combat.hitEnemy` fige 30 ms (70 sur un critique), `killEnemy` 60 ms (forcé), `explosion` 60, un changement de phase de boss 180. Deux garde-fous : jamais par-dessus un ralenti en cours (compétence Dilatation, greffe Nerfs d'acier), et **un petit arrêt par 250 ms au plus** — la musique et `Time.now` continuent pendant l'arrêt, un pistolet tenu aurait figé la moitié du temps de jeu et décalé chaque tir de sa note. `Combat.hitPlayer` fait un ralenti à 35 % pendant 120 ms.

**L'impact.** Les étincelles partent du corps de l'ennemi (`Combat.bodyH(e)` = `Sprites.corps(...).hauteur`, mis en cache sur l'ennemi ; repli `r × 2,4` pour un sprite « accessoire »), dans le sens du coup (7 blanches, 14 dorées sur un critique, cône de 0,7 rad), avec une étincelle de contact de 20 px pendant 90 ms (`slashes` avec `spark`) ; l'ennemi s'écrase (`sx +30 % / sy −22 %`, ancré aux pieds dans `Sprites.draw`) ; le flash blanc est à deux temps (`e.flash = 0,13` : plein au-dessus de 0,07, 35 % en dessous — `Sprites.draw` accepte un flash numérique). L'arc de mêlée part de la taille (`y − 12`) et s'affine en s'effaçant (`7 × (1 − k) + 1`). Le chiffre de dégât naît au corps aussi (sa refonte est F-2).

**Le recul de l'arme** (`Weapons.kick`) : 2 px pour un pistolet, 3 pour une lame, 3 pour un arc, 6 pour une masse, en `outCubic` sur 90 ms, dessiné dans `Player.render` dans le sens opposé à la visée.

**La caméra.** `Camera.kick(mag, angle, ms)` remplace `G.shake` (seize sites) : une impulsion **directionnelle** avec une fraction de degré de rotation (`osc × 0,0012`), décroissance `outCubic`, appliquée par `Camera.shake(ctx)` **avant** le zoom (12 px sont 12 px, pas 18 en tactile), amortie par `Camera.update(dt)`, qui amortit aussi `Camera.pulse` (prêt pour la montée de niveau de F-6). Trois amplitudes, jamais d'autres : 1,6 (tir, coup), 4 (critique, mort, coup reçu, charge dans un mur), 9 (explosion, slam, phase et mort de boss, pulsation modulaire).

**Les polices du monde.** `FONT_PIXEL` (Silkscreen, +15 % de taille) pour les chiffres flottants, les noms d'objets au sol, la porte (`▶`), l'étoile d'étourdissement (`✦`), les dalles I II III, le compte à rebours ; `FONT_TEXT` (VT323) pour les descriptions d'objets au sol. `boot()` attend `document.fonts.ready` (1,5 s au plus) avant le premier rendu. Le HUD garde `HUD_FONT` jusqu'à I-5.

**Les planches.** `drawSheet` accepte `rot`, `sx`, `sy` ancrés aux pieds ; `drawBody` applique à la planche la moitié du squash & stretch et de l'inclinaison de `gait()` — la planche de marche anime déjà les pas, elle n'a pas besoin du rebond, mais le poids se voit.

Test : `ressenti.js` — 13 mesures : Ease et Feel ; 30 / 70 / 60 ms ; le plafond de 250 ms ; le ralenti de compétence intact ; étincelles au corps (aucune aux pieds), dans le sens du coup ; étincelle de contact et écrasement ; secousse dirigée et tournée, même amplitude à zoom 1 et 1,5 ; plus de `G.shake =` dans les sources ; le recul 2 / 3 / 6 ; plus de Segoe UI dans le monde ; la planche de marche de Martin dessinée avec un scale non uniforme.

## 45. Chantier F-2 — les chiffres et le coup reçu (ressenti)

**Les chiffres flottants** (`Floaters`, 30_entities.js) ont un genre, et le genre dit tout :

| Genre | Taille | Couleur | Trajectoire | Durée |
|---|---|---|---|---|
| `dmg` (dégât normal) | 18 px | blanc `#f4f7ff` | monte (`vy −90`, `vx ±40`), retombe (gravité +180) | 0,7 s |
| `crit` (critique) | **30 px** | doré `#ffd166` | monte plus haut (`vy −130`) | 0,85 s |
| `taken` (dégât subi) | **34 px** — le plus gros texte du jeu | corail `#ff5e7a` | **part vers le bas** (`vy +40`) puis remonte (gravité −160) | 0,9 s |
| `heal` (soin) | 20 px | vert `#7fff9a` | monte doucement | 0,7 s |
| `event` (« SONNÉ », « TEMPO ×4 », le nom d'une greffe…) | la taille donnée × 1,15 | la couleur donnée | montée lente | 1,1 s |

Silkscreen, **contour noir de 4 px** (un `strokeText` avant le `fillText` — une ombre d'1 px était illisible sur un sol clair), **sursaut de naissance** (`Ease.outBack` sur 120 ms : le chiffre sort de l'ennemi, il n'apparaît pas dessus), plein jusqu'à 65 % de sa durée puis effacé, dispersion `±14` en X et `−10 / +4` en Y, naissance **au corps** (`Combat.bodyH`). **Fusion** : un `dmg` ou `crit` à moins de 14 px et 120 ms d'un autre s'y additionne et le grossit de 2 px (plafond 40) — trois « 52 » empilés deviennent un « 156 ». Plafond 40 chiffres. Un appel sans genre devine le sien (nombre corail = `taken`, « + » = `heal`, mot = `event`). Le « +n XP » par orbe est sorti du canal (la barre d'XP le dit) ; « TEMPO ×n » reste (seul compteur de série, décision I-1) et « +n ◈ » aussi (seul retour d'une bourse depuis que le HUD ne montre plus les crédits).

**Le coup reçu** (`Combat.hitPlayer`, `Player.render`, `UI.renderHud`) : recul de **7 px en courbe** (`outCubic`, 140 ms) **à l'opposé de la source** du coup (`pl.hurtA`) au lieu d'un créneau de 3 px ; **vignette corail** sur les bords (`pl.hurtVig`, 0,45 → 0 en 350 ms) ; **ralenti** à 35 % pendant 120 ms (`Feel.slow`, jamais par-dessus un ralenti plus fort) ; secousse dirigée depuis la source ; **flash blanc d'une image** (`UI.flashScreen(0.5, 60)`) quand le coup dépasse 15 % des PV max ; clignotement d'invulnérabilité à **6 Hz** (alpha 0,35) au lieu de 10 Hz. La vignette de PV bas (I-1) **bat avec la musique** : `+0,06 × (1 − Beat.phase())`.

Test : `coup.js` — 9 mesures : les cinq genres ; police, contour, sursaut ; fusion (12 + 30 → 42) ; naissance au corps et dispersion ; plus de « +n XP » ; petit coup (vignette, recul −7 px, ralenti 120 ms, pas de flash) ; gros coup (flash, recul dans l'autre sens) ; 6 Hz et vignette sur `Beat`.

## 46. Chantier F-3 — le contrat de couleur (ressenti)

**Une couleur, une intention, sans exception.** La palette vit dans `PAL` (`00_core.js`) ; un effet y prend sa couleur, jamais en dur (`palette.js` balaie les sources).

| Clé | Couleur | Ce qu'elle veut dire | Où |
|---|---|---|---|
| `PAL.self` | cyan `#6ee7ff` | toi et ce qui est à toi | joueur, ruée, bouclier, XP, portée d'aimant |
| `PAL.gold` | or `#ffd166` | le temps, la mesure, la récompense | métronome, anneau de mesure, pièces, critiques, partition, coffre, « EXÉCUTION » |
| `PAL.danger` | corail `#ff5e7a` | le danger qui vient de l'extérieur | dégâts subis, vignette de coup, pièges, zones, barre et nom du boss, yeux dans le noir |
| `PAL.alert` | rouge vif `#ff3b3b` | **ça va frapper** — toutes les télégraphies, rien d'autre | anneau et ligne d'intention des ennemis, patterns et rayons de boss, grosse attaque de la partition, « ENRAGÉS », PV sous 30 % |
| `PAL.life` | vert `#7fff9a` | la vie qui revient | soins, **cœurs** (plus corail), porte ouverte, PV au-dessus de 60 % |
| `PAL.enemyBar` | blanc cassé `#cfd6e6` | la vie des ennemis | leur barre : ni le corail du joueur, ni le cyan de l'XP |
| `PAL.pets` | Uno `#e08a4a` orange · Choupi `#f0c46a` doré · Tanuki `#a8784a` brun · ORI `#c9a3ff` mauve | la seule famille chaude et douce du jeu | leur sprite de repli, leur marque, leur anneau, **leurs chiffres de dégâts** (`info.color` dans `Combat.hitEnemy`) |
| `PAL.muted` | gris `#9aa4c4` | ce qui n'a pas d'intention | porte fermée (une croix grise, plus un danger), sous-titres |

Avant, `#ff5e7a` avait cinq emplois contradictoires (barre de PV pleine, barre ennemie, dégât subi, porte fermée, nom de boss) et la télégraphie prenait la couleur de chaque ennemi : le joueur ne pouvait jamais apprendre « cette couleur = évite ». Les trois ennemis rouge vif (rôdeur `#c0553f`, mèche `#d8613f`, baril `#a8402e`) passent en rouges sourds pour laisser le rouge vif à l'alerte ; les autres avaient déjà leurs teintes de biome. La barre de PV du joueur (vert → or → rouge d'alerte, I-1) est **hachurée sous 25 %** : un état ne se signale jamais par la seule couleur.

Pas touché, à dessein : la teinte du sol (le remède est la lumière, F-5), le CSS des menus (`.chip.bad`, I-3), l'atelier.

Test : `palette.js` — 7 mesures : aucun rouge en dur hors de `PAL` ; télégraphies, barre ennemie, cœurs ; le boss télégraphie en alerte et pas dans sa couleur ; rouges sourds et aucun rouge vif ; les quatre animaux ; un dégât d'Uno en orange ; hachures à 20 %, pas à 50 %.

## 47. Chantier I-3 — le hub en trois questions

**Le camp pose trois questions, dans l'ordre, et un bouton répond.** `showHub()` (50_ui.js) construit `.hub3` : un en-tête (crédits en toutes lettres, bouton **Boutique** avec une pastille quand quelque chose est achetable, **Menu**), une seule zone de défilement `#hub-body`, et le bouton **▶ PARTIR** collé en bas qui récapitule tout (« PARTIR — ADMISSION, 9 salles / Martin + Uno · arme et compétence ensuite »).

| Question | Ce qu'on voit | Ce qu'on ne voit plus |
|---|---|---|
| **1 Qui part ?** | trois cartes 150 × 172 : le portrait animé et le nom, rien d'autre | les stats en chiffres, le caractère, le prix sous chaque ami |
| **2 Avec qui ?** | les animaux en cartes 132 × 138 avec leur sprite 64 px et une ligne de ce qu'ils font, plus une carte **Seul** de même taille qui porte le bonus (+35 % PV, +20 % dégâts) | la boutique des compagnons, les trois modes en boutons sous chaque carte |
| **la carte d'équipe** | l'attelage (« ★ La maisonnée » et sa phrase), le caractère du personnage, trois jauges (PV / Vitesse / Chance sur `STAT_MAX`), et le mode du compagnon **à côté de ce qu'il pilote** (Tout le temps / À l'appel, description courte `PET_MODES[k].short`) | — |
| **3 Où ?** | les paliers en ligne : le jouable en carte pleine (étoiles, « jamais fini », phrase du palier sur le choisi), les verrouillés à moitié largeur avec une seule ligne de condition ; sous la rangée, les paires bonus ⇄ malus du palier en puces (effet en infobulle) | quatre fiches de palier au même poids |

**Choisir un animal** remet le mode à « tout le temps » si on était « Seul » ; **Seul** garde l'animal en mémoire (`petMode = 'none'`, `pet` inchangé). La position de défilement survit à un clic (`hubScroll`).

**La boutique est un écran à part** (`screens.shop`, `showShop()`) : trois onglets Améliorations / Armes / Compétences, et une carte d'amélioration ne montre que **le palier suivant** (« Palier 2/4 : +20 PV — Acheter ◈ 60 »), plus la fiche des quatre. **Les fragments quittent le camp** : entrée « 04 Fragments » du menu principal, écran `screens.lore` (`showFragments()`), décision « le sortir du camp maintenant, réécrire plus tard si l'histoire se décide ».

Chiffres : le camp tient en **moins de 250 mots** (857 avant, 296 au premier jet, ~230 après coupes : description courte des modes, phrase de palier sur le choisi seulement) ; « Gabriel avec ses chats » se fait en **deux clics** (sept interactions avant). Sous 900 px : une colonne, les rangées défilent au doigt, le bouton reste collé en bas.

Test : `hub.js` — 14 mesures (les trois questions, les mots, une seule zone de défilement, portraits et sprites, les verrouillés à moitié largeur sur un profil neuf, le texte de Partir, Gabriel + chats en deux clics, la carte d'équipe, Seul, le défilement gardé, l'écran boutique et sa pastille, un seul palier par carte, les fragments depuis le menu).

## 48. Chantier I-4 — la prépa qui montre

**La planche d'icônes** : 25 SVG de game-icons.net dans `assets/sprites/icons/` (28 Ko), chargés par le même chemin que les accessoires de décor (`PROP_DEFS` avec `d: 'icons'`, rastérisés à 24 px, teintés à la rastérisation). `Sprites.ICONS` dit quelle icône porte quelle notion ; `Sprites.icon(id, taille)` rend un canvas `.icon` prêt à poser dans un écran (null tant que la planche n'est pas chargée : un écran doit tenir sans).

| Notion | Icône | Teinte |
|---|---|---|
| armes : Lame d'essai, Masse de pression, Arc tendeur, Pistolet à ricochet, Boomerang de rappel, Orbe orbitale, Arc voltaïque, Brûleur court | gladius, thor-hammer, high-shot, ricochet, boomerang, orbital, lightning-arc, flamethrower | cyan `#8fdcff` |
| compétences : Ruée, Bouclier, Onde de choc, Dilatation, Tourelle, Saut de phase, Aimant, Surrégime | sprint, checked-shield, sonic-boom, time-trap, sentry-gun, teleport, magnet, overdrive | mauve `#c9a3ff` |
| catégories de greffes : Attaque, Défense, Mobilité, Butin, Spécial | crossed-swords, shield, wingfoot, two-coins, sparkles | corail, bleu, vert, or, mauve |
| notions : coffre, vie, recharge, niveau | locked-chest, hearts, hourglass, upgrade | or, vert, mauve, cyan |
| catégories ajoutées en I-7 : Utilitaire, Synergie | gears, linked-rings | gris, bleu |

**La prépa** (`showPrep`, `.prep2`) : l'en-tête porte le récapitulatif (« Lame d'essai + une compétence ») ; l'étape 0 garde ses deux paires, en lignes, avec le `⇄` entre le bonus et le malus et l'effet écrit ; l'étape 1 est une grille de cartes 190 × 150 calée à gauche, une par arme, avec l'icône 64 px, le nom, la famille et **trois jauges** (dégâts par coup / cadence / portée, sur le maximum du catalogue `WMAX` = 75 / 10 / 720, une valeur non nulle fait au moins 6 %) ; sous la grille, **un seul panneau de détail** `#prep-detail` qui décrit l'arme survolée, sinon la choisie (description, puis `weaponStats` en mots : « 24 dégâts par coup · 2 coups par seconde · portée : à mi-salle · traverse tout ») ; l'étape 2 dit « 3 tirées au sort sur 8 » dans son titre, cartes 300 × 110 avec l'icône et la recharge ; le bandeau MODE TEST est en pied d'écran. Sous 900 px : cartes d'arme `minmax(140px, 1fr)`, compétences en une colonne.

Les distances passent par `portee(px)` (50_ui.js) : ≤ 80 au contact, ≤ 200 de près, ≤ 450 à mi-salle, ≤ 650 loin, au-delà toute la salle.

Test : `prepa.js` — 10 mesures (icône et trois jauges par arme, cartes de 190 px calées à gauche, un seul panneau qui suit le clic puis le survol puis revient, le titre du tirage et les icônes des compétences, le ⇄ des paires, MODE TEST sous le bouton, ni DPS ni px, le récapitulatif du bouton, la grille sous 900 px).

## 49. Chantier F-4 — la mort d'un ennemi et le ramassage (ressenti)

**Tuer produit une image ; ce qu'on ramasse a de la gourmandise.**

**La mort en 220 ms** (`DEATH_MS`, `DEATH_WHITE` en tête de 32_enemies.js). `Combat.killEnemy` pose `e.deathT = 0` ; le corps **reste dans `G.enemies`** tant que `deathT < 0,22 s` (le filtre de `Run.update` le garde, `Room.alive()` ne le compte pas, tout le reste teste déjà `dead`). `Enemy.renderDeath` : 60 ms de **silhouette blanche pleine** (flash 1, +12 %), puis l'écrasement `sx +55 % / sy −80 %` en outCubic en s'effaçant. Autour : `Feel.stop(70, true)`, secousse 4 px dans le sens du coup, **couronne au corps** (22 blanches + 6 dorées + 8 de la couleur de l'ennemi, à `y − bodyH / 2`), une **onde à plat** au sol (`blasts` avec `flat: true` : ellipse 34 px, 220 ms), et une **tache** (`Combat.stain`) dans `G.room.decals` : ellipse sombre 18 × 7 teintée de l'ennemi, échelle au rayon (×2,2 pour un boss), plafond `DECAL_MAX` = 60 (la plus vieille part), dessinée juste après le sol, effacée avec la salle (l'objet salle est refait à chaque `Room.load`).

**Les drops en arc.** Un ramassable a une hauteur `z` (≤ 0, en l'air) et une vitesse `vz` : `Pickups.spawn` part avec `vz ∈ [−140, −260]`, la pesanteur `PICK_GRAVITY` = 520 px/s² le ramène, un rebond amorti (×0,35) au sol s'il tombe assez vite. Le dessin décale l'objet de `z` et garde une **ombre au sol** qui rétrécit avec la hauteur. L'aimantation ramène `z` à 0 et tient une **traînée de trois fantômes** (`p.trail`) de la couleur du genre (`PICK_COLORS`).

**Le ramassage visible** (`Combat.collect`) : des étincelles de la couleur du genre dont **la taille et le nombre suivent la série** (`size = 2 + streak × 0,25`, `count = 5 + streak` — la cascade sonore a maintenant une image ; `Pickups.lastFx` la garde pour les tests), un **anneau** de 12 + streak px ; le **cœur** fait sursauter le joueur (`Feel.pop`) et pose un anneau vert de 40 px ; **relique et arme** sont les seuls ramassages qui interrompent le combat : `Feel.stop(140, true)` et un **rayon de lumière vertical** (`beams`, 360 px, 400 ms) avec une gerbe qui monte.

**Le coffre.** `r.chest.approach` (0 loin → 1 à 40 px) fait grossir le halo bien avant la portée d'ouverture ; à portée il bat. `Run.openChest` ne montre plus l'écran tout de suite : il marque `pending`, arrête l'image 70 ms, secoue, lance une gerbe dorée (26 + 10 étincelles vers le haut) et **sept éclats en arc** (`Pickups` de genre `glint`, `ghost: true` : un décor qui vit 0,9 s, que personne ne ramasse — ni le joueur, ni un animal qui rapporte, ni un aimant) ; `drawChest` lève le couvercle (cadre 1 puis 2) avec un sursaut de 6 px ; après `CHEST_OPEN_MS` = 300 ms, `Run.chestChoice` ouvre l'écran de choix (c'est l'ancien corps d'`openChest`).

Test : `butin.js` — 13 mesures (le corps reste 220 ms puis part et ne compte plus ; blanc à 30 ms et écrasé à 120 ms, mesuré au pixel sur un rendu à part ; arrêt, couronne, onde, tache ; vz < 0 au départ ; montée et retour au sol ; plafond des taches ; purge au changement de salle ; étincelles 2 px × 5 seul contre 4 px × 13 au huitième ; anneau doré ; cœur ; relique ; halo du coffre à l'approche ; ouverture en 300 ms avant l'écran).

## 50. Chantier F-5 — le monde bat (ressenti)

**Ce qui vit bat, ce qui est bâti ne bat pas.** Une seule courbe pour tout : `Beat.pulse(div)` = `1 − outCubic(phase)` (1 pile sur le temps, retombée), `Beat.pulseBar()` (le temps fort seulement), `Beat.phaseDiv(div)` (croche = 2, double = 4). Plus aucun `Math.sin(Time.now × n)` pour ce qui a un rapport avec la musique.

| Qui bat | Comment | Où |
|---|---|---|
| la lumière de la salle | `fillRect` en `lighter` du néon du palier sur la salle, alpha 0,09 × k au temps fort, 0,045 × k ailleurs (`r.lightAlpha`, mesuré par les tests). Le sol reste en cache. | `Room.render`, après le sol et les taches |
| **l'anneau de mesure** | sous les pieds du joueur, dans toutes les salles : ellipse dorée (ratio 0,4) de 26 px, arc qui se remplit sur les quatre temps de la mesure, claque à 40 px sur le temps fort (0,3 temps). Les pastilles de série de la salle du tempo se posent sur son bord avant. | `Tempo.renderRing`, appelé par `Player.render` après l'ombre |
| le joueur | échelle `1 + 0,04 k` partout ; au repos (`pl.movingNow` faux) en plus un bob de −2,2 px et `sx −3 % / sy +3,5 %` | `Player.render` |
| les ennemis | échelle `× (1 + 0,06 k)` ; un boss `× (1 + 0,10 k)` sur le temps fort seulement. Le voyant doré reste réservé aux ennemis à `beatLock` (« celui-ci frappe sur le temps »). | `Enemy.render` |
| les télégraphies | l'anneau et la ligne d'intention battent à la croche (`Beat.pulse(2)`), les annonces des pièges à la double (`2 × Beat.pulse(4) − 1` à la place de `sin(Time.now × 25)`) : la parade s'apprend avec la musique | 32_enemies.js, 34_traps.js |
| les pièces et orbes posés | un petit saut de 3 px sur chaque temps, avec un déphasage `p.ph ∈ [0, 0,25]` tiré à la naissance | `Pickups.render` |
| la porte | `shadowBlur 12 + 10 k` ; une salle vidée **n'ouvre pas la porte tout de suite** : `Room.clear` pose `pendingDoor` et `doorAt = Beat.t + timeToNextBar()`, `Room.update` appelle `Room.openDoor()` à cet instant (son, onde verte de 60 px, `r.doorOpenedAt` pour les tests). L'horloge musicale se recale sur la piste quand la musique démarre (elle peut sauter en arrière) : un rendez-vous parti à plus d'une mesure est repris sur la mesure suivante. La salle du tempo garde son propre chemin (`Tempo.onClear`). | 40_room.js |
| les lumières | `Room.placeLights` : 2 à 4 halos `light` (33_anim.js, rayon 2 tuiles, base 0,5, gain 0,2, néon du palier alterné) aux coins et milieux de murs, tirés du `floorSeed`, dans toutes les salles de tous les paliers, sauf si le contenu de la salle pose déjà ses `anims` de kind `light`. Dessinés par-dessus la salle en additif (`Anim.renderOver`). | `Room.load` |

**La partition au sol** (`Tempo.renderScore`, déjà dans toutes les salles à pièges cadencés) **ne peint plus d'or ni de cadres** — c'était les « cases jaunes » puis les « carrés cerclés de rouge » des lasers : une case annoncée porte quatre coins gris (`PAL.muted`), une case imminente un voile rouge d'alerte (`PAL.alert`, alpha 0,10 à 0,26), jamais un contour. **Les lasers n'y figurent plus** (`scoreAt` ignore les kinds `laser*`) : ils dessinent déjà leur rayon et son annonce, la partition ne parle que pour ce qui frappe des cases (dalles, gaz, scie). L'or est la mesure et la récompense, jamais « ça va frapper ».

Test : `bat.js` — 12 mesures (Beat.pulse ; luminance du sol entre battement plein et nul avec l'alpha attendu ; échelle et écrasement du joueur au repos en salle 1 ; l'anneau doré sondé par `ellipse` ; l'échelle d'un ennemi ; les sources de la télégraphie, des annonces de pièges et de la partition ; le déphasage d'un drop ; les lumières de la salle ; la porte qui attend le temps fort puis s'ouvre à moins de 30 ms avec l'onde).

## 51. Chantier I-5 — le HUD refait

**En une seconde de combat, le joueur lit ses PV, sa compétence, le tempo et le danger — et rien d'autre.**

**Le vocabulaire de dessin** (50_ui.js, exporté par `UI`) : `panel(ctx, x, y, w, h, r, fill)`, `gauge(ctx, x, y, w, h, k, col, {segments, bg, seg})`, `label(ctx, t, x, y, {kind, size, weight, align, color, free})`, `textW(ctx, t, o)` pour mesurer avec la même police, `hudAlpha()` pour le fondu. Les cinq `renderHud` (joueur, compagnon, défi, tempo, boss) passent par là. **Trois polices, celles du CSS** : `kind: 'num'` → Silkscreen (chiffres), défaut → VT323 (texte, un cran plus grand parce que la police est étroite), `kind: 'title'` → Pixelify Sans (`FONT_TITLE`, 00_core.js). Plus jamais la police système : la sonde `hudProbe.fonts` liste les familles vues.

| Bloc | Ce qui est dessiné |
|---|---|
| **moi** (haut gauche, `x = L + 18`) | pastille de niveau 26 px en cyan (×1,6 → ×1 en 0,35 s à la montée, avec un anneau qui se dilate, `r.levelPopT`), barre de PV **220 × 22 segmentée tous les 25 PV** avec « 83 / 150 » dedans en Silkscreen, bouclier en trait au-dessus ; vert / doré / rouge d'alerte, hachurée sous 25 % |
| **XP** | une bande de 4 px **tout en haut de la vue, pleine largeur**, cyan — on la sent monter sans la regarder |
| **haut-centre** | une seule ligne « Salle 5/9 · 1:24 » (Silkscreen 12, boîte à la taille du texte) ; les bandeaux d'entrée s'empilent serrés dans le tiers supérieur (10 % + 40 px par bandeau), jamais au centre |
| **boss** | à la même place : nom en Pixelify Sans corail, barre 480 × 16 **segmentée par phase** (les `hpBelow` des phases suivantes), **entrée de 0 à 100 % en 0,6 s** (`boss.barT0`), **flash blanc** à chaque coup (`boss.flash`), **dégât retardé** en rouge sombre qui rattrape en 0,4 s (`boss.hpLag`) |
| **arme + compétence** (bas gauche, 420 × 44) | l'icône de l'arme (planche I-4), un **anneau de compétence de 34 px, épaisseur 5**, qui se remplit dans le sens horaire, **flash blanc 0,15 s puis anneau vert** qui se dilate quand elle redevient prête, l'icône de la compétence au centre ; le nom et la touche ne s'écrivent que les trois premières salles, ensuite « Prêt » ou « 2,9 s » |
| **compagnon** | même x et même largeur que le cartouche d'arme, sa vie en jauge segmentée, et en mode « à l'appel » une **jauge de 4 px** du repos ou de la présence |
| **défi** | cartouche sous la ligne du haut (T + 44), ou **sous le métronome** (T + 84) dans la salle du tempo, en Pixelify Sans, avec une **jauge de 4 px** quand le défi en a une (`c.gauge`) |
| **greffes** (bas droite) | une grille d'icônes 24 px par catégorie (planche I-4), 10 par ligne, **×n** en bas à droite d'un doublon, le nom au survol de la souris seulement |

**Le HUD s'estompe** : après 4 s sans dégât ni ennemi vivant ni boss (`rm.lastDamageT`, `rm.lastKillT`, en temps de salle), les blocs secondaires (arme, greffes, compagnon, défi) descendent à 45 % en 0,6 s et **remontent en 0,15 s** dès qu'un ennemi paraît. Le fondu suit l'horloge murale, pas celle du jeu.

**Dans le monde** : les barres ennemies sont **segmentées à 25 %** ; les télégraphies portent une **zone d'impact au sol** dans la couleur d'alerte — un cône de la largeur du corps pour une charge, une bande pour un tir visé, un disque pour une invocation ou une mèche (`e.teleZone`). Pas fait, à dessein : la pulsation de 2 % du décor au temps fort (la lumière de F-5 bat déjà, un zoom en plus fatiguerait).

Test : `hud.js` — 14 mesures (le rectangle central libre, les trois polices, la barre segmentée avec les chiffres dedans, la bande d'XP, la pastille qui grossit, la ligne du haut, l'anneau qui flashe, la grille des greffes avec ×n, la barre du boss dans le tiers supérieur segmentée par phase, l'entrée et le dégât retardé, les trois tailles de chiffres, le fondu à 45 % et sa remontée, les barres ennemies segmentées, les zones d'impact en alerte).

## 52. Chantier I-6 — une seule voix

**Une règle pour qui a le droit de parler pendant un combat.** Un seul point d'entrée, `UI.notify({ text, sub, color, level, key, secs, x, y })` (50_ui.js), et quatre niveaux :

| Niveau | Nom | Ce que ça fait |
|---|---|---|
| 0 | vital | l'écran : flash blanc et secousse ; s'il y a un texte, un bandeau qui coupe tout |
| 1 | danger | dans le monde : un chiffre flottant à `(x, y)` ; sans position, **un bandeau qui interrompt le courant** et passe devant la file (ENRAGÉS, Mauvais ordre, Renforts, changement de phase du boss) |
| 2 | événement | **un seul bandeau à la fois**, 1,4 s, dans la zone libre ; les autres font la queue (six au plus) — vagues, défis, salle sécurisée, arme d'essai, relique, compagnon |
| 3 | info | un toast en bas à droite, **trois au plus**, **retenu tant qu'un ennemi est à moins de 400 px** du joueur (`pendingToasts`), vidé par `UI.clearInfo()` quand la salle est sécurisée — compagnons, crédits, fragments, bonus d'XP |

`banner(text, color, sub)` et `toast(text, secs)` restent : ce sont des enveloppes vers `notify` (niveau 2 et 3), et les textes restent dans le code qui les émet (le test du vocabulaire les balaie). **Déduplication** : deux messages de même clé (`key`, sinon le texte) à moins de 3 s n'en font qu'un (`seenKeys`, horloge murale) — la vague porte la clé `wave`, la phase du boss `phase<n>`. **Zone libre** (`UI.zoneLibre()`) : le bandeau vit au tiers supérieur, sauf si le joueur y est à l'écran (caméra bloquée par le bord de la salle) — alors au tiers inférieur ; jamais au centre. **Figé** : un panneau ouvert sur la partie (`G.overlay` en `run` : montée de niveau, coffre, pause) arrête l'horloge des messages. **Une nouvelle salle** appelle `UI.clearAll()` : rien de l'ancienne ne reste à dire. `UI.messages()` expose ce qui est visible et ce qui attend, pour les tests.

Test : `messages.js` — 8 mesures (dix messages en une image → un bandeau, quatre en file, trois toasts ; doublon et même clé ; le niveau 1 coupe le courant ; le toast retenu près d'un ennemi puis libéré ; la salle sécurisée vide les infos ; le panneau fige ; le bandeau descend quand le joueur est en haut ; un seul `banners.push`).

## 53. Chantier F-6 — les moments forts (ressenti)

**La montée de niveau, le boss, la mort et l'entrée de salle sont des scènes, pas des incréments.** Une scène est un objet sur la salle (`G.room.scene = { kind, t, dur, … }`) ou sur la partie (`r.deathScene`, `r.winScene`), avancé par `Run.updateScenes` **en temps réel** (`Run.rawDt(dt)` : un ralenti n'étire pas une scène). Les rendez-vous musicaux sont des instants de `Beat.t` calculés par `Run.barAfter(délai)` (le premier temps fort après le délai), repris sur la mesure suivante si l'horloge se recale. La caméra a deux nouveaux leviers (00_core.js) : `Camera.lookAt(x, y, ms)` (un point à regarder à la place du joueur, `Camera.target()` dans la boucle) et `Camera.zoomTo(z, vitesse)` (`zoomFx`, multiplié au zoom courant dans `apply`).

| Scène | Ce qui se passe |
|---|---|
| **montée de niveau** (`Run.levelUpScene`, en plein combat seulement — en prépa, entre deux salles ou pour le bot, l'écran vient tout de suite) | `Feel.stop(120)`, `Camera.pulse 0,06`, un anneau doré à plat de 170 px (550 ms), 40 étincelles vers le haut, la silhouette blanche 200 ms (`pl.whiteT`), « NIVEAU n » en 40 px, **le compagnon saute** (`pet.hop()`), et l'écran de choix s'ouvre **sur le temps fort suivant** (`r.levelAt`, `r.levelUpAt` pour les tests) |
| **arrivée du boss** (`Room.spawnBoss`, scène `bossIn`, 1,4 s) | rideau de deux bandes noires de 40 px (HUD), la caméra va sur lui 0,9 s et revient, zoom 1 → 1,12 → 1, **il descend de 120 px** (`b.introDrop`, tout son dessin décalé, l'ombre reste au sol et grossit), **trois pas de secousse espacés d'un temps exact** (`Beat.beatLen()`), son nom sur la bande du bas en Silkscreen |
| **mort du boss** (`Room.onBossDefeated`, scène `bossOut`, 1,6 s réelles) | ralenti ×0,25 posé par-dessus l'arrêt sur image, `Camera.pulse 0,08`, **cinq explosions échelonnées** tous les 0,25 s autour du corps (`rm.bossExplosions`), le corps qui blanchit puis s'écrase pendant toute la scène (`deathDur` 0,4 s de jeu), les pièces en arc (F-4), **le compagnon qui court au corps** et saute (`pet.celebrate`) |
| **mort du joueur** (`Run.onPlayerDeath`) | `Feel.slow(0,18, 1400)`, **les ennemis figés** (`Run.update` ne les met plus à jour), voile sombre à 0,55 en 1,2 s + vignette corail (`r.deathScene`, HUD), zoom 1 → 1,3 sur le corps, **le compagnon vient s'asseoir à côté** (`pet.mourn` → `mournStep` : Uno se couche — `sx 1,25 / sy 0,55` —, ORI se pose, Choupi et Tanuki tournent autour ; `def.mourn` peut l'imposer), l'écran de fin **en temps réel** après la chute et au moins 1,4 s (`r.endReal` — la bande ralentit, un temps fort n'y aurait plus de sens) |
| **victoire** (`Run.endLevel`) | la même image à l'envers : voile doré, l'animal qui saute, zoom 1,15, l'anneau de mesure qui s'ouvre à 86 px (`r.winScene`), l'écran de fin sur le temps fort suivant (`r.endAt`) |
| **entrée de salle** (`Room.load` / `Room.update` en `intro`) | le joueur part dans le mur de gauche (`r.entry`) et **entre en marchant** 500 ms en outCubic, sa planche joue la marche, la caméra le rejoint ; `Room.begin` finit l'entrée d'un coup si l'intro est sautée (débogage) ; **un seul texte** : le nom de la salle en bas, en petit, 2,4 s (`rm.introLabelT`) — plus de bandeau « Salle n/9 » ; le bandeau du défi reste |

Le bot (`G.autoplay`) saute les scènes qui attendent : montée de niveau et écrans de fin immédiats, pas de rideau. Les tests `mort.js` et `human.js` attendent désormais l'écran de fin jusqu'à 6 s.

Test : `scenes.js` — 10 mesures (l'entrée en marchant, la place finale, le texte unique ; la scène de montée de niveau et son écran sur le temps fort ; l'arrivée du boss et ses trois secousses au temps ; sa mort en 1,6 s avec le compagnon au corps ; la mort du joueur avec le voile, les ennemis figés, le compagnon couché ; l'écran de fin après 1,4 s).

## 54. Chantier F-7 — les compagnons et le dash (ressenti)

**Qu'un ami qui a joué cinq minutes se souvienne de son animal.** Tout est dans 31_pets.js, sauf le dash (30_entities.js) et le porteur (Pickups).

| Qui | Ce qu'il fait maintenant |
|---|---|
| **Uno** (bite) | au contact, il **s'accroupit** (`crouch` : sx 1,14 / sy 0,86) dans les 200 ms qui précèdent le temps de sa morsure (le prochain temps est un multiple de `every` et `distToBeat < 0,2`) ; à la morsure : pop de 0,35 (`Feel.pop`), étincelle blanche de 16 px au point de morsure, `Feel.stop(40)`, 3 particules orange en cône, son chiffre en orange (F-3). `lastBite` garde l'instant pour les tests. |
| **Choupi** (collect) | **allongée en course** (`stretch` : sx 1,18 / sy 0,86) avec 4 fantômes (`pushTrail`) ; la collecte se fait **en deux temps** : l'objet reçoit `carrier = elle` et vole vers elle (en arc, `vz = −160`), puis passe en `magnet` vers le joueur (`p.stages = ['pet', 'player']`). Un porteur sonné ou reparti lâche l'objet au joueur. |
| **Tanuki** (charge) | un **flash** d'anticipation un demi-temps avant de partir (`preRoll`), une onde à plat dans sa couleur au départ, **il tourne** pendant la roulade (`rollSpin += dt × 14`, dans le sens de la course, `rot` passé à `drawSheet` / `drawProp`), 6 fantômes. |
| **ORI** (mark) | un **trait pointillé animé** vers sa cible (`renderLine` : `lineDashOffset` qui court, franc 150 ms puis discret), la marque qui bat à la croche (`Beat.pulse(2)`), un flottement propre (`sin(t × 2,2) × 5`) et une ombre plus petite et plus floue en l'air. |
| **l'appel** | le compagnon **entre par le bord de l'écran** le plus proche (`arrive`, 250 ms en outCubic, 8 fantômes), l'onde de choc à l'arrivée (déjà là), et **son nom en bandeau dans sa couleur** (`notify` niveau 2) — plus un toast gris. |
| **le repos** | après 3 s sans agir ni se déplacer de plus de 12 px de son point de repos (`idleT`, `restAnchor`), il se tourne vers le joueur et prend sa pose (`restPose`, ou `def.rest`) : **Uno s'assied** (sx 1,06 / sy 0,9), les chats **font leur toilette** (un hochement toutes les secondes), ORI **se pose** (plus de flottement). Sans description de l'auteur, ce sont les poses par défaut — une ligne par animal les change. |
| **la ruée** | 5 fantômes du sprite (le premier au départ, quatre en route, effacés en 300 ms), **étirement orienté** (sx 1,22 / sy 0,90 le long du dash), onde blanche de 26 px au départ, `Camera.pulse −0,015`, 8 grains de poussière en cône opposé à l'arrivée. **En rythme** (à moins de 90 ms d'un temps, `dashOnBeat`) : fantômes **dorés** et le son **une quinte plus haut** (`AudioEngine.dash({ pitch: 1.5 })`) — rien de plus, la décision « purement visuel » est appliquée. |

Test : `animaux.js` — 8 mesures (l'accroupissement et la morsure à moins de 30 ms d'un temps, le repos assis tourné vers le joueur, l'appel depuis le bord avec le nom en couleur, la ruée et ses cinq fantômes, l'or sur le temps, Choupi allongée et la collecte en deux temps, Tanuki qui flashe puis tourne, le trait d'ORI).

## 55. Chantier I-7 — choisir et finir en un coup d'œil

**Les écrans qui interrompent la partie disent l'essentiel en une image, et la mort donne envie de repartir.**

**Montée de niveau et coffre** (`showChoice`, `cardHtml`) : le titre porte « — choix 1 sur n » ; au-dessus des cartes, la bande des greffes déjà prises (« Déjà à toi : » + pastilles, ou « Première greffe de la partie ») ; chaque carte a un **ruban de rareté** pleine largeur en haut (`.ribbon`, couleur de `RARITY`), un **rond coloré avec l'icône de la catégorie** (planche I-4, `Sprites.icon(catégorie, 40)`, l'initiale si la planche n'est pas là — deux icônes ajoutées : `gears` pour Utilitaire, `linked-rings` pour Synergie), un fond teinté (`color-mix` 12 %), une bordure de 2 px, et **l'état actuel du joueur** pour la stat touchée (`etatActuel` : « chance de crit : tu es à 17 % », « dégâts : tu es à 140 % » — le premier `mod` de la greffe, lu dans `pl.stats`). Le coffre garde son titre et reçoit **une phrase** pour sous-titre (« Traversée sans dégât : une trouvaille Colossale garantie », « Une mort en route : rien de colossal cette fois »…), plus de pourcentage de qualité.

**Écran de fin** (`showEnd`) : **deux gros chiffres** en Silkscreen 2,6 em (crédits ramenés, salle atteinte sur 9 — les plus grands textes de l'écran), la ligne « Meilleure tentative : salle n · celle-ci : salle m » (`Meta.profile.bestRoom`, tenu par `recordRun`), **la phrase du compagnon** en grand (VT323), un bouton « **Avec n crédits tu peux prendre Vitalité 2** » quand la moins chère des améliorations est à portée (il ramène au camp et ouvre la boutique sur les améliorations), le détail (banque, butin, prime, niveau, ennemis, dégâts, le rapport) replié sous un `<details>`, et deux boutons : **« Repartir tout de suite — Martin + Uno, ADMISSION »** en primaire (relance `Run.start` avec la même équipe, la même arme, la même compétence, sans passer par le hub) et « Camp de base ». **Le HUD de combat ne se dessine plus** derrière l'écran de fin (90_main.js).

**Pause** (`togglePause`) : six informations de partie (salle, temps, PV, niveau, crédits en jeu, équipe) en Silkscreen, l'arme et la compétence avec leurs chiffres en mots (`weaponStats`), les greffes en pastilles, le rappel des commandes (clavier ou tactile), les curseurs et le menu stylés (`accent-color`, `select` sombre), et **le jeu assombri à 70 %** derrière (`#ui #screen-pause`).

Test : `fin.js` — 11 mesures (le titre et les cartes de la montée de niveau, l'état actuel et la bande des prises, la phrase du coffre, les informations de la pause, ses curseurs et son fond, les deux gros chiffres, la progression et le détail replié, la suggestion d'achat, « Repartir » sans hub, le HUD éteint derrière la fin, la boutique ouverte par la suggestion).

## 56. Chantier I-8 — le pouce

**Une partie complète jouable au pouce, lisible sur un écran de 900 px.** Ce chantier remplace la partie tactile du chantier 10 du plan principal ; la mesure de performance sur téléphone réel y reste.

- **Le HUD grossit d'un facteur 1,35** sous `Input.touch.active` : `UI.hudBegin(ctx)` / `UI.hudEnd(ctx)` (50_ui.js) posent l'échelle et donnent aux cinq `renderHud` une vue réduite d'autant (ils continuent d'écrire en px de HUD) ; réentrant (`UI.renderHud` et `renderToasts` se protègent eux-mêmes, 90_main.js enveloppe le groupe). La sonde `hudProbe` note tout en px d'écran (×k), `UI.hudScale()` dit k. Les positions qui viennent du monde (zone libre des bandeaux, souris sur la grille des greffes) sont ramenées dans la vue du HUD.
- **Le joystick reste visible au repos** (`.tstick.rest`, en bas à gauche à 55 %), avec **« pose ton pouce ici »** tant qu'on n'a jamais touché (`Meta.profile.touchHinted`) ; au toucher il saute sous le doigt, comme avant.
- **Le tir automatique est le défaut** d'un profil neuf (`touchAutoFire: true`, la pause permet de l'éteindre) ; le bouton TIR est **en pointillé** quand il est automatique, **translucide à 55 %** tant qu'il n'est pas pressé sinon.
- **Un bouton d'esquive dédié** (ESQ., 72 px) : `Player.dodge()` — la compétence si c'est la ruée, sinon **un pas de côté libre** de 110 px en 0,14 s dans la direction du joystick (ou face au joueur), sans invulnérabilité, 1,2 s de recharge (`pl.hop`, `pl.hopCd`), un peu de poussière et le son de la ruée plus grave. Le joueur au clavier fait ce pas avec ses touches ; au pouce il lui fallait un bouton.
- **E** dans l'arc du pouce droit (au-dessus de TIR), **pause et plein écran en haut, à droite de la ligne « Salle n/9 »**, hors de la zone de préhension.
- **Toutes les cibles font au moins 44 px** quelle que soit l'échelle (`max(44px, calc(N × var(--ui-scale)))` sur les boutons tactiles ; `body.touch` impose 48 px de haut aux boutons, onglets, cartes, chips et `summary`, 44 aux petits boutons).
- **Hub et prépa au pouce** : les rangées de cartes défilent au doigt (`body.touch .hub3 .row`), la prépa passe ses armes en `minmax(140px, 1fr)` et ses compétences en une colonne, **la boutique prend tout l'écran**.

Test : `touch.js` — 13 mesures (les six d'avant, plus l'esquive, les cibles ≥ 44 px, l'échelle ×1,35, le joystick au repos et l'indication disparue, le tir automatique et le bouton en pointillé, pause et plein écran hors de la prise, le TIR translucide sans tir automatique, le camp en rangées défilables sans cible sous 44 px). `interface_mobile.js` lit désormais l'échelle.

Pas fait, faute de téléphone sous la main : la vérification à bout de bras (lisibilité, touches accidentelles, images par seconde) — c'est la partie 10 du plan principal, qui reste à faire avec un vrai appareil.

## 57. Retours de l'auteur après I-8 — les lueurs pré-dessinées et le KO des compagnons

**Deux remarques de l'auteur, le 11 septembre 2026 : « les animaux n'ont pas d'animation quand ils meurent pourtant on a les sprites » et « j'ai des ralentissements quand il se passe beaucoup de choses à l'écran, quand un ennemi meurt, que je ramasse beaucoup de pièces ».**

- **Le KO des compagnons** : `Pet.update` (31_pets.js) sortait avant `animStep` tant que `downT > 0`, donc le clip restait figé sur « idle » ou « walk » et la planche `hurt` (9 images, 10 i/s, jouée une fois) ne partait jamais. Une ligne : `this.animStep(dt, false)` dans la branche sonnée. Il n'existe pas de planche « mort » pour les animaux (ils ne meurent pas, ils sont sonnés `revive` secondes) : `hurt` est la bonne.
- **Les ralentissements venaient de `shadowBlur`** : chaque forme dessinée avec une ombre floue coûte une passe de flou gaussien, et le prix explose sous `globalAlpha` ou une rotation. Une mort d'ennemi posait 36 particules floutées pendant une demi-seconde, chaque pièce ramassée 5 à 17 de plus **et une onde floutée à 24 px** ; chaque pièce au sol, chaque orbe, chaque projectile portait le sien. Trois morts et quarante pièces, c'était trois cents flous par image.
- **`Halo` (00_core.js)** : la lueur d'un disque est dessinée **une fois** par (couleur, rayon arrondi au demi-pixel, flou) dans un petit canvas — la forme est tracée hors du canvas, seule son ombre tombe dedans — puis collée d'un `drawImage` (`Halo.draw(ctx, x, y, r, color, blur)`) ; cache borné à 200 entrées. `Halo.ring(ctx, x, y, rx, ry, color, width, blur, alpha)` remplace l'ombre d'un anneau par un trait large et pâle (28 %) sous le trait net ; `ry` en fait une ellipse à plat.
- **Convertis** : `Particles.render` (lueur des particules), `Projectiles.render` (toutes les balles, flèches, boomerangs), `Pickups.render` (XP, pièces, reflets, cœurs, bourses, alliés, fragments, reliques, armes), les ondes de `Room.renderFx` (rondes et à plat), la télégraphie des ennemis (`Enemy.render`), et les points du défi « lumières coupées » (balles et yeux). Restent en `shadowBlur`, un par objet et peu d'objets : pièges, blocs modulaires, porte, coffre, boss, tempo — à mesurer au chantier 10 ([66]).
- **Mesure** (`dev/perf-ab.js`, rendu logiciel, écart « scène − vide » par image, ancien → nouveau) : 100 objets au sol 0,87 → 0,23 ms ; 288 particules de mort 2,03 → 1,13 ms ; 12 télégraphies 1,79 → 0,63 ms ; 40 ondes de ramassage 1,09 → 0,36 ms ; le pire cas (12 ennemis dont 4 morts, 100 objets, 108 particules, 20 balles, 20 ondes) 2,77 → 1,40 ms. Sur un canvas accéléré (téléphone, portable), un flou coûte bien plus qu'ici : le gain réel est à confirmer par l'auteur.

Test : `lueurs.js` — 4 mesures (le canvas du halo, l'absence de `shadowBlur` dans les quatre rendus convertis, le cache borné, la planche « hurt » du compagnon sonné qui défile jusqu'à sa dernière image).
