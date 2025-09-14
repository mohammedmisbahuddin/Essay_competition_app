# Railway Deployment Guide

## 🚀 Two-Service Deployment Strategy

This app now uses a **two-service deployment** approach on Railway:

1. **Backend Service** - Node.js/Express API
2. **Frontend Service** - Next.js React App

## 📋 Deployment Steps

### Step 1: Deploy Backend Service

1. **Create a new Railway project** for the backend
2. **Connect your repository** and select the root directory
3. **Railway will automatically detect** the `railway.json` configuration
4. **Set environment variables** in Railway dashboard:
   ```
   NODE_ENV=production
   PORT=5001
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=24h
   FRONTEND_URL=https://your-frontend-url.railway.app
   ```
5. **Deploy** - Railway will build using `backend/Dockerfile`

### Step 2: Deploy Frontend Service

1. **Create another Railway project** for the frontend
2. **Connect the same repository** but set the **root directory to `frontend/`**
3. **Railway will use** `frontend/railway.json` configuration
4. **Set environment variables** in Railway dashboard:
   ```
   NODE_ENV=production
   PORT=3000
   NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app/api
   NEXT_TELEMETRY_DISABLED=1
   ```
5. **Deploy** - Railway will build using `frontend/Dockerfile`

### Step 3: Update URLs

1. **Get the Railway URLs** for both services
2. **Update the environment variables**:
   - In **Backend**: Update `FRONTEND_URL` to your frontend Railway URL
   - In **Frontend**: Update `NEXT_PUBLIC_API_URL` to your backend Railway URL + `/api`

## 🔧 Configuration Files

### Backend (`backend/railway.json`)
- Uses `backend/Dockerfile`
- Exposes port 5001
- Health check: `/health`

### Frontend (`frontend/railway.json`)
- Uses `frontend/Dockerfile`  
- Exposes port 3000
- Health check: `/`

## 🐳 Docker Configuration

### Backend Dockerfile
- Node.js 18 Alpine
- Installs only production dependencies
- Runs on port 5001
- Includes health check

### Frontend Dockerfile
- Node.js 18 Alpine
- Builds Next.js app
- Serves static files
- Runs on port 3000

## 🔍 Troubleshooting

### Common Issues:

1. **Build Failures**
   - Check that all dependencies are in `package.json`
   - Ensure Dockerfile paths are correct

2. **CORS Errors**
   - Verify `FRONTEND_URL` in backend matches actual frontend URL
   - Check CORS configuration in `server.js`

3. **API Connection Issues**
   - Verify `NEXT_PUBLIC_API_URL` in frontend matches backend URL
   - Ensure backend is running and accessible

4. **Environment Variables**
   - All required variables must be set in Railway dashboard
   - Check variable names match exactly (case-sensitive)

## 📊 Monitoring

- **Backend Health**: `https://your-backend-url.railway.app/health`
- **Frontend Health**: `https://your-frontend-url.railway.app/`

## 🔄 Updates

To update the deployment:
1. Push changes to your repository
2. Railway will automatically rebuild and redeploy
3. Both services will restart with new code

---

**Note**: This replaces the previous single-service deployment approach which was incompatible with Next.js.
