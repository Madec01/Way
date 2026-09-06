# Musiques

Le jeu lit les fichiers de ce dossier par leur nom, sans modification de code :

| Fichier | Utilisé pour |
|---|---|
| `menu.mp3` | Menu principal (sans ce fichier : la musique du hub) |
| `hub.mp3` | Salle Zéro (hub) |
| `biome1-1.mp3` | Biome 1 (ADMISSION) : salles 1 à 4 (et 6 à 8 s'il n'y a pas de `biome1-2.mp3`, en reprenant là où elle s'était arrêtée) |
| `biome1-2.mp3` | Biome 1, salles 6 à 8 (même tempo que `biome1-1.mp3` : la salle du tempo s'y cale) |
| `boss1.mp3` | Biome 1 : salle 5 (mini-boss) et salle 9 (revanche) |
| `biome2-1.mp3`, `biome2-2.mp3`, `boss2.mp3` | Biome 2, même logique |
| `biome3-1.mp3`, `biome3-2.mp3`, `boss3.mp3` | Biome 3, même logique |

L'ancien nom `biome1.mp3` reste accepté en repli si `biome1-1.mp3` manque.

Formats acceptés : `.mp3`, `.ogg` ou `.m4a` (cherchés dans cet ordre). Noms **en minuscules** (GitHub Pages distingue `Biome1.mp3` de `biome1.mp3`). Les pistes bouclent toutes seules.

`tempo.json` est généré par `python3 dev/analyze_music.py` : BPM, premier temps et tonalité de chaque piste, lus par la salle du tempo (salle 7). À relancer après avoir changé une piste ; sans lui, la salle bat à 120 BPM sur un métronome interne.
Si un fichier manque, le jeu joue une musique générative (nappes filtrées, percussions à base de bruit).
Le jeu doit être servi par un site (GitHub Pages ou `python3 -m http.server`) : ouvert en `file://`, le navigateur interdit la détection des fichiers et le jeu passe en génératif.
