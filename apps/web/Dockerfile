# ---------- deps ----------
FROM node:22-bookworm-slim AS deps
WORKDIR /app

# on installe les deps sans exécuter les scripts (pour éviter prisma generate ici)
COPY package*.json ./
# copier les manifests des workspaces pour que npm ci résolve correctement
COPY apps/web/package.json ./apps/web/package.json
COPY apps/worker/package.json ./apps/worker/package.json
COPY prisma ./prisma
RUN npm ci --omit=dev --ignore-scripts

# ---------- builder ----------
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# copier tout le repo (contexte = racine via compose)
COPY . .

# installer les dépendances avec dev pour le build
RUN npm ci --include=dev --ignore-scripts

# générer le client Prisma (maintenant que le code est là)
RUN npx prisma generate

# argon2 a un module natif -> on installe les outils de build et on reconstruit
RUN apt-get update && apt-get install -y --no-install-recommends python3 build-essential && rm -rf /var/lib/apt/lists/*
RUN npm rebuild argon2

# Intégrer le site TP Algo Python : si projet Vite présent, construire et copier dist/, sinon fallback copie brute
RUN set -eux; \
  mkdir -p apps/web/public/tp-algo; \
  if [ -f site-nsi-tp-algo_python/site-nsi-tp/package.json ]; then \
    cd site-nsi-tp-algo_python/site-nsi-tp; \
    corepack enable; corepack prepare pnpm@9.8.0 --activate; \
    pnpm install --no-frozen-lockfile; \
    pnpm build; \
    cd - >/dev/null; \
    cp -a site-nsi-tp-algo_python/site-nsi-tp/dist/. apps/web/public/tp-algo/; \
  elif [ -d site-nsi-tp-algo_python/site-nsi-tp ]; then \
    cp -a site-nsi-tp-algo_python/site-nsi-tp/. apps/web/public/tp-algo/; \
  elif [ -d site-nsi-tp-algo_python ]; then \
    cp -a site-nsi-tp-algo_python/. apps/web/public/tp-algo/; \
  fi || true

# Variables de build non sensibles uniquement
ARG NEXT_BASE_PATH \
    APP_BASE_URL
ENV NEXT_BASE_PATH=$NEXT_BASE_PATH \
    APP_BASE_URL=$APP_BASE_URL

# Créer un .env.production minimal pour satisfaire Zod au build (valeurs factices)
RUN printf "OPENAI_API_KEY=dummy-openai-key-abcdefghijklmnopqrstuvwxyz\n" \
    "EMBEDDING_PROVIDER=gemini\n" \
    "GEMINI_API_KEY=dummy-gemini-key-abcdefghijklmnopqrstuvwxyz\n" \
    "GEMINI_EMBEDDINGS_MODEL=text-embedding-004\n" \
    "VECTOR_DIM=768\n" \
    "APP_BASE_URL=http://localhost:3000\n" \
    "DATABASE_URL=postgresql://user:pass@localhost:5432/db\n" \
    "REDIS_URL=redis://localhost:6379\n" \
    "S3_ENDPOINT=http://minio:9000\n" \
    "S3_ACCESS_KEY=dummy-access\n" \
    "S3_SECRET_KEY=dummy-secret\n" \
    "S3_BUCKET=reports\n" \
    "S3_REGION=us-east-1\n" \
    "JWT_SECRET=dummy-jwt-secret-should-be-long-enough-123456\n" > apps/web/.env.production

# build du workspace web via le script racine (Next charge .env.production)
RUN npm run build

# Pruner les devDependencies pour préparer le runtime plus léger
RUN npm prune --omit=dev

# ---------- runner ----------
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# copier ce qui est nécessaire à l’exécution
# dépendances production prunées depuis l'étape builder (inclut client Prisma généré)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/Ressources_NSI_Premiere.html ./Ressources_NSI_Premiere.html
COPY --from=builder /app/Ressources_NSI_Terminale.html ./Ressources_NSI_Terminale.html
COPY --from=builder /app/bilans_evaluation_TAD.json ./bilans_evaluation_TAD.json
COPY --from=builder /app/TERMINALE_NSI.csv ./TERMINALE_NSI.csv
COPY --from=builder /app/TERMINALE_NSI_24_eleves_corrige.csv ./TERMINALE_NSI_24_eleves_corrige.csv
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/data ./data
COPY --from=builder /app/scripts ./scripts
# copier tsconfig pour ts-node des scripts si présents
COPY --from=builder /app/tsconfig.scripts.json ./tsconfig.scripts.json
COPY --from=builder /app/apps/web/tsconfig.json ./tsconfig.json

# Installer clients nécessaires (openssl pour prisma; postgresql-client pour psql de test)
# + Dépendances système Playwright pour exécuter Chromium en headless
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl libssl3 postgresql-client curl poppler-utils \
    libglib2.0-0 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
    libxkbcommon0 libatspi2.0-0 libxcomposite1 libxdamage1 libxfixes3 \
    libxrandr2 libgbm1 libpango-1.0-0 libasound2 \
  && rm -rf /var/lib/apt/lists/*

# Exécuter en utilisateur non-root
RUN chown -R node:node /app
USER node

EXPOSE 3000
# le script start racine route vers le workspace web (npm -w nsi-web run start)
CMD ["npm","run","start"]
