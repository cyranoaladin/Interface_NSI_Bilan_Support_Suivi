# Documentation legacy (pipeline LaTeX)

Ces documents appartiennent à l’ancienne architecture de génération PDF (LaTeX + Mustache + latexmk).

Depuis 2025-09, la génération des bilans PDF est 100 % React-PDF (composants factorisés, `MarkdownRenderer`, `ScoreTable`, `Header/Footer`).

Motif de l’archivage:
- Supprimer tout risque de confusion pour les nouveaux contributeurs
- Conserver une trace historique de la conception précédente

Pour toute intervention sur le rendu PDF, se référer désormais à:
- `apps/worker/src/pdf-components.js`
- `apps/worker/src/EleveBilan.js`
- `apps/worker/src/EnseignantBilan.js`
- `apps/worker/src/index.js` (rendu via React-PDF)
