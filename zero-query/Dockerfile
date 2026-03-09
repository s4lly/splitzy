# Build stage
FROM node:24-alpine AS builder

WORKDIR /workspace

RUN corepack enable

# Copy workspace manifests for deterministic installs
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY zero-query/package.json ./zero-query/

# Install only zero-query dependencies (including dev deps for build)
RUN pnpm install --frozen-lockfile --filter zero-query...

# Copy source files
COPY zero-query/tsconfig.json ./zero-query/
COPY zero-query/src ./zero-query/src

WORKDIR /workspace/zero-query

# Build TypeScript
RUN pnpm run build

# Production stage
FROM node:24-alpine AS runner

WORKDIR /workspace

ENV NODE_ENV=production

RUN corepack enable

ARG BUILD_VERSION=unknown
ENV BUILD_VERSION=$BUILD_VERSION

# Copy workspace manifests for production dependency install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY zero-query/package.json ./zero-query/

# Install production dependencies only for zero-query
RUN pnpm install --frozen-lockfile --prod --filter zero-query...

WORKDIR /workspace/zero-query

# Copy built files from builder
COPY --from=builder /workspace/zero-query/dist ./dist

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Run the application
CMD ["node", "dist/index.js"]

