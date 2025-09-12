# Multi-stage Dockerfile for Essay Competition App - Single Service
# Stage 1: Build Frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend source code
COPY frontend/ ./

# Install frontend dependencies (including devDependencies for build)
RUN npm config set fund false && \
    npm config set audit false && \
    echo "Installing dependencies..." && \
    npm install && \
    echo "Installation complete. Checking installed packages..." && \
    ls -la node_modules/ | head -10 && \
    echo "Checking for Next.js..." && \
    ls -la node_modules/next/ || echo "Next.js package not found"

# Build frontend
RUN echo "Checking if Next.js is installed..." && \
    ls -la node_modules/.bin/next || echo "Next.js binary not found" && \
    npm run build

# Stage 2: Build Backend
FROM node:18-alpine AS backend-builder

WORKDIR /app/backend

# Install system dependencies
RUN apk add --no-cache libc6-compat python3 make g++

# Copy backend package files
COPY backend/package*.json ./

# Install backend dependencies
RUN npm config set fund false && \
    npm config set audit false && \
    npm config set update-notifier false && \
    npm ci --omit=dev || npm install --omit=dev

# Copy backend source code
COPY backend/src ./src
COPY backend/env.example ./env.example

# Create directories (database will be initialized by the app)
RUN mkdir -p ./database ./uploads

# Stage 3: Production Image
FROM node:18-alpine AS production

# Install system dependencies
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Copy backend from builder stage
COPY --from=backend-builder /app/backend ./

# Copy frontend build from builder stage
COPY --from=frontend-builder /app/frontend/out ./public

# Create necessary directories
RUN mkdir -p /app/database /app/uploads

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 backend && \
    chown -R backend:nodejs /app

# Switch to non-root user
USER backend

# Expose port
EXPOSE 5001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the backend server
CMD ["npm", "start"]
