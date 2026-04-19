# =============================================================================
# Performex CRM — Backend Dockerfile (multi-stage)
# =============================================================================

# ── Stage 1: Dependencies ─────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Install build tools for native addons (bcrypt, sharp, etc.)
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci --prefer-offline

# ── Stage 2: Development ──────────────────────────────────────────────────────
FROM node:20-alpine AS development
WORKDIR /app

RUN apk add --no-cache chromium \
  && addgroup -g 1001 -S nodejs \
  && adduser  -S nodejs -u 1001

# Tell Puppeteer to use the system Chromium installed above
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    PUPPETEER_SKIP_DOWNLOAD=true

COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./

# Source is bind-mounted at runtime; no COPY needed for dev
EXPOSE 4000

USER nodejs
CMD ["npm", "run", "dev"]

# ── Stage 3: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ── Stage 4: Production ───────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

RUN apk add --no-cache chromium \
  && addgroup -g 1001 -S nodejs \
  && adduser  -S nodejs -u 1001

ENV NODE_ENV=production \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    PUPPETEER_SKIP_DOWNLOAD=true

COPY --from=deps    /app/node_modules ./node_modules
COPY --from=builder /app/dist         ./dist
COPY package.json ./

EXPOSE 4000

USER nodejs
CMD ["node", "dist/server.js"]
