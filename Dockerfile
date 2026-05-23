# ── Stage 1: Build frontend ───────────────────────────────────────────────────
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ── Stage 2: Build backend ────────────────────────────────────────────────────
FROM node:22-alpine AS backend-builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Stage 3: Production image ─────────────────────────────────────────────────
FROM node:22-alpine
WORKDIR /app

# Install production deps only
COPY package*.json ./
RUN npm ci --omit=dev

# Compiled backend
COPY --from=backend-builder /app/dist ./dist

# Compiled frontend (served as static files by the backend)
COPY --from=frontend-builder /app/frontend/dist ./public

EXPOSE 8080
ENV NODE_ENV=production

CMD ["node", "dist/server.js"]
