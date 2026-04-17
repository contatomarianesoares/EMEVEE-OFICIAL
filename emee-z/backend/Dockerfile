# ── Estágio 1: dependências ──────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Instala apenas dependências de produção
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

# ── Estágio 2: imagem final ───────────────────────────────────
FROM node:20-alpine

# Cria usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && adduser -S emee -u 1001

WORKDIR /app

# Copia dependências e código
COPY --from=deps --chown=emee:nodejs /app/node_modules ./node_modules
COPY --chown=emee:nodejs . .

USER emee

EXPOSE 3000

# Graceful shutdown
STOPSIGNAL SIGTERM

CMD ["node", "src/index.js"]
