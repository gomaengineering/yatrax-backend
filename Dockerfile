# =============================================================================
# Stage 1: Dependencies
# Install production dependencies only; layer cached when package*.json unchanged
# =============================================================================
FROM node:20-alpine AS deps
WORKDIR /app

# Copy dependency manifests first for better layer caching
COPY package.json package-lock.json* ./

# Install production dependencies only; use ci for reproducible builds
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# =============================================================================
# Stage 2: Production runtime
# Minimal image with only app + production node_modules
# =============================================================================
FROM node:20-alpine AS runner
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Copy production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./

# Copy application source (only what's needed at runtime)
COPY src ./src
COPY public ./public
COPY docs ./docs

# Own files (except node_modules which stays root for security)
RUN chown -R nodejs:nodejs /app/src /app/public /app/docs /app/package.json

USER nodejs

# Coolify and most PaaS expect PORT from environment
ENV NODE_ENV=production
EXPOSE 3001

# Use exec form to avoid shell, run node directly
CMD ["node", "src/index.js"]
