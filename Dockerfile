# syntax=docker/dockerfile:1

# ---------- Etapa 1: instalar dependencias de producción ----------
FROM node:22-alpine AS deps
WORKDIR /app
# Herramientas para compilar sqlite3 si no hay binario precompilado para Alpine
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---------- Etapa 2: imagen final, ligera y sin herramientas de compilación ----------
FROM node:22-alpine
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    DB_FILE=/app/data/database.sqlite

# Commit con el que se construyó la imagen (lo pasa GitHub Actions)
ARG GIT_SHA=local
ENV GIT_SHA=$GIT_SHA

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src
RUN mkdir -p /app/data && chown node:node /app/data

# No correr como root dentro del contenedor
USER node

EXPOSE 3000
VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "src/server.js"]
