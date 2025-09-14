# Backend Dockerfile for Railway
FROM node:18-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache libc6-compat python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm config set fund false && \
    npm config set audit false && \
    npm ci --omit=dev || npm install --omit=dev

# Copy source code
COPY src ./src
COPY env.example ./env.example

# Create necessary directories
RUN mkdir -p ./database ./uploads

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 backend && \
    chown -R backend:nodejs /app

USER backend

# Expose port
EXPOSE 5001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the server
CMD ["npm", "start"]
