# Multi-stage build for Essay Competition Management App
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build backend
WORKDIR /app/backend
RUN npm install
RUN npm run build || echo "No build step for backend"

# Build frontend
WORKDIR /app/frontend
RUN npm install
RUN npm run build

# Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/frontend/.next/standalone ./
COPY --from=builder /app/frontend/.next/static ./frontend/.next/static
COPY --from=builder /app/frontend/public ./frontend/public

# Create database directory
RUN mkdir -p /app/database
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000
EXPOSE 5000

ENV PORT 3000
ENV NODE_ENV production

# Start both frontend and backend
CMD ["sh", "-c", "cd backend && npm start & cd frontend && npm start"]

