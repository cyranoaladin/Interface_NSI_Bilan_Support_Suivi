# CHANGELOG

## [2025-09] Migration React-PDF
- Suppression complète du pipeline LaTeX (Mustache + latexmk).
- Ajout de composants PDF factorisés (`pdf-components.js`, `EleveBilan.js`, `EnseignantBilan.js`).
- Rendu désormais 100% React-PDF (MarkdownRenderer, ScoreTable, Header/Footer).
- Ajout de tests unitaires pour `MarkdownRenderer`.
- Nouveau guide pédagogique injecté dans RAG : `GUIDE_PEDAGOGIQUE_NSI_PMF.md`.
