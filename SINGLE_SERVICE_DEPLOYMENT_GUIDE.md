# Single Service Deployment Guide

## 🚀 Deploy Essay Competition App as Single Service on Railway

This guide will help you deploy the Essay Competition Management App as a single Railway service with both frontend and backend combined.

---

## 📋 Prerequisites

1. **Railway Account**: Create account at [railway.app](https://railway.app)
2. **GitHub Repository**: Your code is already pushed to GitHub
3. **Node.js**: Version 18+ (Railway will handle this)

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────┐
│           Single Service                │
│  ┌─────────────┐  ┌─────────────────┐  │
│  │  Frontend   │  │    Backend      │  │
│  │  (Next.js)  │  │   (Node.js)    │  │
│  │  Static     │  │   API Server    │  │
│  └─────────────┘  └─────────────────┘  │
│           Railway Service                │
└─────────────────────────────────────────┘
                    │
                    ▼
            ┌─────────────────┐
            │   PostgreSQL    │
            │   Database      │
            │   Railway       │
            └─────────────────┘
```

---

## 🗄️ Step 1: Deploy PostgreSQL Database

### 1.1 Create Database Service
1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Click "New" → "Database" → "PostgreSQL"
4. Railway will create a PostgreSQL database
5. Note the `DATABASE_URL` from the database service

### 1.2 Database Configuration
- **Service Name**: `essay-competition-db`
- **Database**: PostgreSQL
- **Storage**: 1GB (free tier)
- **Backups**: Automatic daily backups

---

## 🚀 Step 2: Deploy Single Service

### 2.1 Create Main Service
1. In your Railway project dashboard
2. Click "New" → "GitHub Repo"
3. Select your repository: `mohammedmisbahuddin/Essay_competition_app`
4. Railway will automatically detect the `Dockerfile` and `railway.json`

### 2.2 Service Configuration
- **Service Name**: `essay-competition-app`
- **Builder**: Dockerfile (automatically detected)
- **Port**: 5001 (configured in railway.json)

---

## ⚙️ Step 3: Configure Environment Variables

### 3.1 Required Environment Variables
Add these in your Railway service settings:

```bash
# Application Configuration
NODE_ENV=production
PORT=5001

# JWT Secret (for authentication)
JWT_SECRET=7672827dcc36694692936a7cdc28c739dd71391f3fcf8bbd916a73c6d12a2ef3b58a63bccf203d43fabd334498ab04b5cdb3b557ceb51f8670904126bcdeb8a3

# Database (from your PostgreSQL service)
DATABASE_URL=postgresql://postgres:your-password@postgres.railway.internal:5432/railway

# CORS Configuration
FRONTEND_URL=*

# File Upload Configuration
MAX_FILE_SIZE=5242880
UPLOAD_DIR=uploads

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

### 3.2 How to Add Environment Variables
1. Go to your service dashboard
2. Click "Variables" tab
3. Add each variable with its value
4. Click "Add" for each variable

---

## 🔄 Step 4: Deploy and Monitor

### 4.1 Deploy
1. Railway will automatically start building when you connect the repository
2. Monitor the build logs in the "Deployments" tab
3. Wait for the build to complete successfully

### 4.2 Build Process
The Dockerfile will:
1. **Build Frontend**: Install dependencies and build Next.js app
2. **Build Backend**: Install Node.js dependencies
3. **Create Production Image**: Combine frontend and backend
4. **Start Service**: Run on port 5001

### 4.3 Health Check
- **Health Endpoint**: `https://your-app.railway.app/health`
- **Frontend**: `https://your-app.railway.app/`
- **API**: `https://your-app.railway.app/api/*`

---

## 🧪 Step 5: Test Deployment

### 5.1 Test Frontend
1. Visit your Railway app URL
2. You should see the Essay Competition Management App
3. Test login functionality

### 5.2 Test Backend API
1. Visit `https://your-app.railway.app/health`
2. Should return: `{"status":"OK","timestamp":"..."}`
3. Test API endpoints at `/api/*`

### 5.3 Test Database Connection
1. Try to register a new user
2. Check if data is saved to PostgreSQL
3. Verify database connectivity

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Build Failures
- **Check Dockerfile**: Ensure all paths are correct
- **Check Dependencies**: Verify package.json files exist
- **Check Logs**: Review Railway build logs for errors

#### 2. Runtime Errors
- **Environment Variables**: Ensure all required variables are set
- **Database Connection**: Verify DATABASE_URL is correct
- **Port Configuration**: Ensure PORT=5001 is set

#### 3. Frontend Not Loading
- **Static Files**: Check if frontend build completed successfully
- **CORS Issues**: Verify FRONTEND_URL is set to "*"
- **Routing**: Ensure SPA routing is configured correctly

### Debug Commands
```bash
# Check service logs
railway logs

# Check environment variables
railway variables

# Restart service
railway redeploy
```

---

## 📊 Monitoring and Maintenance

### 1. Logs
- **View Logs**: Railway dashboard → Service → Logs
- **Real-time**: Monitor logs during deployment
- **Error Tracking**: Check for runtime errors

### 2. Performance
- **Metrics**: Railway provides basic metrics
- **Uptime**: Monitor service availability
- **Resource Usage**: Check CPU and memory usage

### 3. Updates
- **Code Changes**: Push to GitHub triggers automatic deployment
- **Environment Variables**: Update in Railway dashboard
- **Database**: Managed automatically by Railway

---

## 🎯 Success Checklist

- [ ] PostgreSQL database deployed
- [ ] Single service deployed successfully
- [ ] Environment variables configured
- [ ] Frontend accessible at root URL
- [ ] Backend API responding at `/api/*`
- [ ] Health check endpoint working
- [ ] Database connection established
- [ ] User registration/login working

---

## 🆘 Support

If you encounter issues:

1. **Check Railway Logs**: Most errors are visible in the deployment logs
2. **Verify Environment Variables**: Ensure all required variables are set
3. **Test Locally**: Run the app locally to verify it works
4. **Railway Documentation**: [docs.railway.app](https://docs.railway.app)

---

## 🎉 Congratulations!

Your Essay Competition Management App is now deployed as a single service on Railway! 

- **Frontend**: Served as static files
- **Backend**: API server handling requests
- **Database**: PostgreSQL for data storage
- **Single URL**: Everything accessible from one domain

Happy managing your essay competitions! 🏆
