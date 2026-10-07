# ==========================================
# Multi-stage Dockerfile for Cloud Run
# Optimized for minimal footprint & fast cold-start
# ==========================================

# Stage 1: Build TypeScript source
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Stage 2: Production runtime image
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy compiled JavaScript from builder stage
COPY --from=builder /app/dist ./dist

# Run as non-root user for container security
USER node

EXPOSE 8080

CMD ["node", "dist/index.js"]
