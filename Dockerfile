# ==================================================
# PHASE 5.1 - Dockerfile Multi-Stage Optimisé
# ==================================================

# Stage 1: Base image avec Node.js
FROM node:18-alpine AS base

# Installe les dépendances système nécessaires
RUN apk add --no-cache libc6-compat openssl curl

# Set working directory
WORKDIR /app

# Enable corepack for yarn/pnpm support
RUN corepack enable

# ==================================================
# Stage 2: Dependencies installation
# ==================================================
FROM base AS deps

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies with production optimizations
RUN npm ci --only=production --audit=false --fund=false
RUN npm cache clean --force

# Generate Prisma client
RUN npx prisma generate

# Store production dependencies
RUN cp -R node_modules /tmp/node_modules_prod

# Install all dependencies for build
RUN npm ci --audit=false --fund=false

# ==================================================
# Stage 3: Build the application
# ==================================================
FROM base AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Set build environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Generate Prisma client for build
RUN npx prisma generate

# Build the application with optimizations
RUN npm run build

# ==================================================
# Stage 4: Production image
# ==================================================
FROM base AS runner

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy production dependencies
COPY --from=deps /tmp/node_modules_prod ./node_modules

# Copy Prisma schema and client
COPY --from=builder /app/prisma ./prisma
COPY --from=deps /app/node_modules/.prisma ./node_modules/.prisma

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy health check script
COPY --from=builder /app/scripts/healthcheck.js ./scripts/
RUN chmod +x ./scripts/healthcheck.js

# Create logs directory
RUN mkdir -p /app/logs && chown nextjs:nodejs /app/logs

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node scripts/healthcheck.js || exit 1

# Start the application
CMD ["node", "server.js"]

# ==================================================
# Stage 5: Development image (optional)
# ==================================================
FROM base AS development

WORKDIR /app

# Install all dependencies for development
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --audit=false --fund=false
RUN npx prisma generate

# Copy source code
COPY . .

# Create development user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
RUN chown -R nextjs:nodejs /app

USER nextjs

# Expose ports (app + dev server)
EXPOSE 3000 3001

# Development command
CMD ["npm", "run", "dev"]