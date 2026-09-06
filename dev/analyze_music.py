#!/usr/bin/env python3
"""Analyse des pistes de assets/music/ → assets/music/tempo.json (BPM, décalage du premier temps, tonalité).
Usage : python3 dev/analyze_music.py            (dépend de librosa : pip install librosa)
Le jeu lit tempo.json pour caler la salle du tempo sur la musique ; une piste absente du fichier → métronome interne à 120 BPM."""
import json, os, sys, warnings
warnings.filterwarnings('ignore')
import numpy as np, librosa
HERE = os.path.dirname(os.path.abspath(__file__)); MUSIC = os.path.join(HERE, '..', 'assets', 'music')
NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
MAJ = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]); MIN = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
out = {}
for f in sorted(os.listdir(MUSIC)):
    if not f.lower().endswith(('.mp3', '.ogg', '.m4a')): continue
    y, sr = librosa.load(os.path.join(MUSIC, f), sr=22050, mono=True)
    oenv = librosa.onset.onset_strength(y=y, sr=sr, hop_length=512)
    tempo, beats = librosa.beat.beat_track(onset_envelope=oenv, sr=sr, hop_length=512, units='time')
    tempo = float(np.atleast_1d(tempo)[0]); ibi = np.diff(beats)
    # BPM affiné = médiane des intervalles ; décalage = premier temps recalé sur la grille (moindres carrés modulo)
    beat = float(np.median(ibi)); bpm = 60 / beat
    ph = np.angle(np.exp(2j * np.pi * beats / beat).mean()) / (2 * np.pi) * beat; offset = float(ph % beat)
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr).mean(axis=1)
    best = max(((np.corrcoef(np.roll(MAJ, k), chroma)[0, 1], NOTES[k], 'major') for k in range(12)), key=lambda t: t[0])
    bestm = max(((np.corrcoef(np.roll(MIN, k), chroma)[0, 1], NOTES[k], 'minor') for k in range(12)), key=lambda t: t[0])
    key = best if best[0] >= bestm[0] else bestm
    stable = float(np.std(ibi)) < 0.02
    out[f] = { 'bpm': round(bpm, 2), 'offset': round(offset, 3), 'key': key[1], 'mode': key[2], 'duration': round(len(y) / sr, 1), 'stable': stable }
    print(f"{f}: {bpm:.2f} BPM, premier temps à {offset:.3f}s, {key[1]} {key[2]}, {'stable' if stable else 'TEMPO INSTABLE'}")
with open(os.path.join(MUSIC, 'tempo.json'), 'w') as fh: json.dump(out, fh, indent=1)
print('→ assets/music/tempo.json')
