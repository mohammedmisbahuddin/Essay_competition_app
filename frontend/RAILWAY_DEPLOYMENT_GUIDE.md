# Railway Frontend Deployment Guide

## Overview
This guide explains how to deploy the Essay Competition Management Frontend to Railway.

## Prerequisites
1. Railway account (sign up at https://railway.app)
2. Railway CLI installed (`npm install -g @railway/cli`)
3. Docker installed locally (for testing)

## Local Docker Testing
Before deploying to Railway, test the Docker container locally:

```bash
# Build the Docker image
docker build -t essay-frontend .

# Run the container
docker run -d -p 3000:3000 --name essay-frontend-test essay-frontend

# Test the application
curl http://localhost:3000

# Clean up
docker stop essay-frontend-test && docker rm essay-frontend-test
```

## Railway Deployment

### Method 1: Using Railway CLI (Recommended)

1. **Login to Railway:**
   ```bash
   railway login
   ```

2. **Initialize Railway project:**
   ```bash
   railway init
   ```

3. **Set environment variables:**
   ```bash
   railway variables set NODE_ENV=production
   railway variables set NEXT_PUBLIC_API_URL=https://essaycompetitionbackend-production-e729.up.railway.app/api
   railway variables set PORT=3000
   ```

4. **Deploy:**
   ```bash
   railway up
   ```

### Method 2: Using Railway Dashboard

1. **Connect GitHub repository:**
   - Go to https://railway.app/dashboard
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Select the `frontend` folder as the root directory

2. **Configure environment variables:**
   - Go to your project settings
   - Add the following variables:
     - `NODE_ENV`: `production`
     - `NEXT_PUBLIC_API_URL`: `https://essaycompetitionbackend-production-e729.up.railway.app/api`
     - `PORT`: `3000`

3. **Deploy:**
   - Railway will automatically detect the Dockerfile and deploy

## Configuration Files

### Dockerfile
- Uses Node.js 18 Alpine
- Installs dependencies with Yarn
- Builds the Next.js application
- Runs as non-root user for security
- Includes health checks

### railway.json
- Configures Railway deployment settings
- Sets health check path and timeout
- Configures restart policy

### nixpacks.toml
- Alternative build configuration for Railway
- Uses Node.js 18 and Yarn
- Defines build and start commands

## Environment Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Node.js environment |
| `NEXT_PUBLIC_API_URL` | `https://essaycompetitionbackend-production-e729.up.railway.app/api` | Backend API URL |
| `PORT` | `3000` | Port for the application |

## Health Checks

The application includes health checks that verify:
- The application is running on port 3000
- The root endpoint (`/`) is accessible
- Health check timeout: 100 seconds

## Troubleshooting

### Common Issues

1. **Build fails with npm authentication errors:**
   - The Dockerfile uses Yarn instead of npm to avoid corporate npm registry issues
   - Yarn is configured to use the public npm registry

2. **Application not accessible:**
   - Check that the `PORT` environment variable is set to `3000`
   - Verify the health check is passing
   - Check Railway logs for errors

3. **API calls failing:**
   - Verify `NEXT_PUBLIC_API_URL` is set correctly
   - Check that the backend is running and accessible
   - Review browser network tab for CORS issues

### Logs and Debugging

```bash
# View Railway logs
railway logs

# View specific service logs
railway logs --service frontend

# Connect to Railway shell
railway shell
```

## Post-Deployment

After successful deployment:

1. **Test the application:**
   - Visit the Railway-provided URL
   - Test login functionality
   - Verify API calls are working

2. **Monitor performance:**
   - Check Railway metrics
   - Monitor response times
   - Watch for errors in logs

3. **Set up custom domain (optional):**
   - Go to Railway project settings
   - Add custom domain
   - Configure DNS records

## Security Considerations

- The application runs as a non-root user
- Environment variables are securely managed by Railway
- HTTPS is automatically enabled
- Health checks help ensure service availability

## Scaling

Railway automatically handles:
- Load balancing
- Auto-scaling based on traffic
- Zero-downtime deployments
- Rolling updates

## Support

For issues with:
- **Railway platform:** Check Railway documentation or support
- **Application code:** Review application logs and code
- **Docker issues:** Test locally with Docker first
