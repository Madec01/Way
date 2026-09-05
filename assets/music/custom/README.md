# Vos musiques

Déposez ici vos fichiers, ils remplacent automatiquement les pistes fournies (aucune modification de code) :

| Fichier | Utilisé pour |
|---|---|
| `hub.mp3` | Salle Zéro (hub) et menu |
| `biome1.mp3` | Palier ADMISSION, salles 1 à 8 |
| `boss.mp3` | Salle 5 (mini-boss) et salle 9 (revanche) |

Formats acceptés : `.mp3`, `.ogg` ou `.m4a` (le jeu cherche dans cet ordre). Les pistes bouclent toutes seules.
Le fichier doit être servi par un serveur web (GitHub Pages ou `python3 -m http.server`) : ouvert en `file://`, le navigateur interdit la détection des fichiers et le jeu garde les pistes fournies.
