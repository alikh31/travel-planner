# Travel Planner - Runtime Build Docker Image
FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache libc6-compat openssl openssl-dev ca-certificates

WORKDIR /app

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including dev dependencies for building)
RUN npm ci

# Copy application source code
COPY . .

# Set ownership to nextjs user
RUN chown -R nextjs:nodejs /app

# Create directory for SQLite database
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL="file:/app/data/prod.db"
ENV PRISMA_CLI_BINARY_TARGETS="linux-musl-openssl-3.0.x"
ENV PRISMA_CLIENT_ENGINE_TYPE="binary"
ENV OPENSSL_CONF=/dev/null

# Create entrypoint script that builds and runs
RUN echo '#!/bin/sh' > /app/entrypoint.sh && \
    echo 'set -e' >> /app/entrypoint.sh && \
    echo '' >> /app/entrypoint.sh && \
    echo 'echo "🔨 Building application at runtime..."' >> /app/entrypoint.sh && \
    echo '' >> /app/entrypoint.sh && \
    echo '# Generate Prisma client' >> /app/entrypoint.sh && \
    echo 'echo "📦 Generating Prisma client..."' >> /app/entrypoint.sh && \
    echo 'npx prisma generate' >> /app/entrypoint.sh && \
    echo '' >> /app/entrypoint.sh && \
    echo '# Run database migrations' >> /app/entrypoint.sh && \
    echo 'echo "🗄️ Running database setup..."' >> /app/entrypoint.sh && \
    echo 'npx prisma db push --accept-data-loss' >> /app/entrypoint.sh && \
    echo '' >> /app/entrypoint.sh && \
    echo '# Build the application' >> /app/entrypoint.sh && \
    echo 'echo "🏗️ Building Next.js application..."' >> /app/entrypoint.sh && \
    echo 'npm run build' >> /app/entrypoint.sh && \
    echo '' >> /app/entrypoint.sh && \
    echo 'echo "🚀 Starting application..."' >> /app/entrypoint.sh && \
    echo 'exec npm start' >> /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]