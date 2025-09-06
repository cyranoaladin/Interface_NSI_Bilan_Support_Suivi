FROM node:20-bullseye
WORKDIR /app

# Outils nécessaires (LaTeX, Tesseract, LibreOffice) pour le job de génération
RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-latex-recommended texlive-latex-extra texlive-fonts-recommended latexmk \
    tesseract-ocr libreoffice \
 && rm -rf /var/lib/apt/lists/*

# IMPORTANT : copier le package.json racine + celui du workspace avant npm ci
COPY package*.json ./
COPY apps/worker/package.json ./apps/worker/package.json

# Installe toutes les deps du monorepo (incluant celles du workspace worker)
RUN npm ci --include=dev --ignore-scripts

# Puis copier le reste du repo
COPY . .

# Exécuter depuis le workspace du worker
WORKDIR /app/apps/worker

CMD ["node", "src/index.js"]
