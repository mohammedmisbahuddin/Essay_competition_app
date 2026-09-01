# Use Node.js 18 Alpine image
FROM node:18-alpine

# Install dependencies
RUN apk add --no-cache libc6-compat curl

# Set working directory
WORKDIR /app

# Add cache-busting layer to force rebuild
ARG CACHE_BUST=1
RUN echo "Cache bust: $CACHE_BUST"

# Copy package files
COPY package.json package-lock.json* ./

# Use yarn instead of npm
RUN yarn config set registry https://registry.npmjs.org/ && \
    yarn config set strict-ssl false && \
    yarn install --frozen-lockfile

# Copy source code
COPY . .

# Set environment variables for build
ENV NEXT_PUBLIC_API_URL=https://essaycompetitionbackend-production-e729.up.railway.app/api
ENV NODE_ENV=production

# Clean any existing build
RUN rm -rf .next

# Build the application using yarn
RUN yarn build

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set correct permissions
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000 || exit 1

# Start the application
CMD ["yarn", "start"]