# ---------- deps ----------
FROM node:20-bullseye-slim AS deps
WORKDIR /app

# on installe les deps sans exécuter les scripts (pour éviter prisma generate ici)
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --include=dev --ignore-scripts

# ---------- builder ----------
FROM node:20-bullseye-slim AS builder
WORKDIR /app

# récupérer node_modules installés
COPY --from=deps /app/node_modules ./node_modules
# copier tout le repo (contexte = racine via compose)
COPY . .

# générer le client Prisma (maintenant que le code est là)
RUN npx prisma generate

# argon2 a un module natif -> on installe les outils de build et on reconstruit
RUN apt-get update && apt-get install -y --no-install-recommends python3 build-essential && rm -rf /var/lib/apt/lists/*
RUN npm rebuild argon2

# passer les variables au build Next (validées par Zod)
ARG OPENAI_API_KEY \
    HF_TOKEN \
    APP_BASE_URL \
    DATABASE_URL \
    REDIS_URL \
    S3_ENDPOINT \
    S3_ACCESS_KEY \
    S3_SECRET_KEY \
    SMTP_HOST \
    SMTP_USER \
    SMTP_PASS \
    SMTP_FROM \
    MAGIC_LINK_FROM \
    JWT_SECRET
ENV OPENAI_API_KEY=$OPENAI_API_KEY \
    HF_TOKEN=$HF_TOKEN \
    APP_BASE_URL=$APP_BASE_URL \
    DATABASE_URL=$DATABASE_URL \
    REDIS_URL=$REDIS_URL \
    S3_ENDPOINT=$S3_ENDPOINT \
    S3_ACCESS_KEY=$S3_ACCESS_KEY \
    S3_SECRET_KEY=$S3_SECRET_KEY \
    SMTP_HOST=$SMTP_HOST \
    SMTP_USER=$SMTP_USER \
    SMTP_PASS=$SMTP_PASS \
    SMTP_FROM=$SMTP_FROM \
    MAGIC_LINK_FROM=$MAGIC_LINK_FROM \
    JWT_SECRET=$JWT_SECRET

# build du workspace web via le script racine
RUN npm run build

# ---------- runner ----------
FROM node:20-bullseye-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# copier ce qui est nécessaire à l’exécution
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
# le script start racine route vers le workspace web (npm -w nsi-web run start)
CMD ["npm","run","start"]
