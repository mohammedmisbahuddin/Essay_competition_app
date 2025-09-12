# Separate Services Deployment Guide

## 🚀 Deploy Backend, Frontend, and Database Separately on Railway

This guide will help you deploy the Essay Competition Management App as three separate Railway services for better control, scalability, and maintenance.

---

## 📋 Prerequisites

1. **Railway Account**: Create account at [railway.app](https://railway.app)
2. **GitHub Repository**: Your code is already pushed to GitHub
3. **Node.js**: Version 18+ (Railway will handle this)

---

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend       │    │   Backend       │    │   PostgreSQL    │
│   (Next.js)      │───▶│   (Node.js)     │───▶│   Database      │
│   Railway        │    │   Railway       │    │   Railway       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 🗄️ Step 1: Deploy PostgreSQL Database

### 1.1 Create Database Service
1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Click "New" → "Database" → "PostgreSQL"
4. Railway will create a PostgreSQL database
5. Note the `DATABASE_URL` from the database service 
postgresql://postgres:zRiUwAAXIgDcWykrNLZEFKtGpgbqlvjj@postgres.railway.internal:5432/railway

### 1.2 Database Configuration
- **Service Name**: `essay-competition-db`
- **Database**: PostgreSQL
- **Storage**: 1GB (free tier)
- **Backups**: Automatic daily backups

---

## 🔧 Step 2: Deploy Backend Service

### 2.1 Create Backend Service
1. In your Railway project dashboard
2. Click "New" → "GitHub Repo"
3. Select your repository: `mohammedmisbahuddin/Essay_competition_app`
4. Railway will detect it's a Node.js project

### 2.2 Configure Backend Service
1. **Service Name**: `essay-competition-backend`
2. **Root Directory**: Set to `backend/`
3. **Build Command**: `npm install`
4. **Start Command**: `npm start`

### 2.3 Backend Environment Variables
Add these environment variables to your backend service:

```bash
# Database (from your PostgreSQL service)
DATABASE_URL=postgresql://username:password@host:port/database

# Application Configuration
NODE_ENV=production
PORT=5001

# JWT Secret (CHANGE THIS!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# CORS Configuration (update with your frontend URL)
CORS_ORIGIN=https://your-frontend-service.railway.app

# File Upload Configuration
MAX_FILE_SIZE=5242880
UPLOAD_DIR=uploads

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

### 2.4 Deploy Backend
1. Railway will automatically deploy when you push to GitHub
2. Check the deployment logs for any errors
3. Your backend will be available at: `https://your-backend-service.railway.app`

---

## 🎨 Step 3: Deploy Frontend Service

### 3.1 Create Frontend Service
1. In your Railway project dashboard
2. Click "New" → "GitHub Repo"
3. Select the same repository: `mohammedmisbahuddin/Essay_competition_app`
4. Railway will detect it's a Next.js project

### 3.2 Configure Frontend Service
1. **Service Name**: `essay-competition-frontend`
2. **Root Directory**: Set to `frontend/`
3. **Build Command**: `npm run build`
4. **Start Command**: `npm start`

### 3.3 Frontend Environment Variables
Add these environment variables to your frontend service:

```bash
# Backend API URL (your backend service URL)
NEXT_PUBLIC_API_URL=https://your-backend-service.railway.app/api

# Next.js Configuration
NODE_ENV=production
PORT=3000
```

### 3.4 Deploy Frontend
1. Railway will automatically build and deploy
2. Your frontend will be available at: `https://your-frontend-service.railway.app`

---

## 🔄 Step 4: Connect Services

### 4.1 Update Backend CORS
In your backend service environment variables, update:
```bash
CORS_ORIGIN=https://your-frontend-service.railway.app
```

### 4.2 Update Frontend API URL
In your frontend service environment variables, update:
```bash
NEXT_PUBLIC_API_URL=https://your-backend-service.railway.app/api
```

### 4.3 Redeploy Services
Both services will automatically redeploy when you update environment variables.

---

## 🗄️ Step 5: Database Migration

### 5.1 Run Migration Script
```bash
# Set your DATABASE_URL
export DATABASE_URL="postgresql://username:password@host:port/database"

# Run migration
cd backend
npm run migrate
```

### 5.2 Verify Migration
Check your Railway PostgreSQL database to ensure:
- ✅ All tables are created
- ✅ Default admin user exists
- ✅ Competition settings are populated

---

## 🔍 Step 6: Testing Deployment

### 6.1 Test Backend
```bash
# Health check
curl https://your-backend-service.railway.app/health

# Should return: {"status":"OK","timestamp":"..."}
```

### 6.2 Test Frontend
1. Visit your frontend URL
2. Try logging in with:
   - **Username**: admin
   - **Password**: admin123
3. Test all major features:
   - ✅ CSV import
   - ✅ Participant management
   - ✅ Evaluation system
   - ✅ Settings update

### 6.3 Test Database Connection
1. Check Railway database logs
2. Verify backend can connect to database
3. Test data operations (create, read, update, delete)

---

## 🔧 Step 7: Railway Service Configuration

### 7.1 Service Settings
For each service, configure:

**Backend Service:**
- **Health Check**: `/health`
- **Restart Policy**: On failure
- **Scaling**: Manual (start with 1 instance)

**Frontend Service:**
- **Health Check**: `/`
- **Restart Policy**: On failure
- **Scaling**: Manual (start with 1 instance)

**Database Service:**
- **Backup Policy**: Daily
- **Scaling**: Manual (start with basic plan)

### 7.2 Custom Domains (Optional)
1. Go to each service → "Settings" → "Domains"
2. Add your custom domain
3. Update DNS records as instructed
4. Update environment variables with custom domains

---

## 📊 Step 8: Monitoring & Maintenance

### 8.1 Railway Dashboard
- Monitor resource usage for each service
- Check deployment logs
- View database metrics
- Monitor service health

### 8.2 Database Management
- View database logs
- Monitor connection count
- Check storage usage
- Manage backups

### 8.3 Service Scaling
- Upgrade Railway plan for more resources
- Add more instances for high availability
- Scale database storage as needed

---

## 💰 Cost Estimation

### Railway Free Tier (per service):
- **Backend**: $5 credit monthly
- **Frontend**: $5 credit monthly  
- **PostgreSQL**: 1GB storage
- **Total**: **FREE** for small organizations

### Railway Pro (when needed):
- **Backend**: $5/month
- **Frontend**: $5/month
- **PostgreSQL**: $5/month
- **Total**: **$15/month** per organization

---

## 🚨 Troubleshooting

### Common Issues:

#### 1. Backend Can't Connect to Database
```bash
# Check DATABASE_URL format
echo $DATABASE_URL
# Should be: postgresql://username:password@host:port/database
```

#### 2. Frontend Can't Connect to Backend
```bash
# Check NEXT_PUBLIC_API_URL
echo $NEXT_PUBLIC_API_URL
# Should be: https://your-backend-service.railway.app/api
```

#### 3. CORS Errors
```bash
# Update CORS_ORIGIN in backend
CORS_ORIGIN=https://your-frontend-service.railway.app
```

#### 4. Build Failures
```bash
# Check Railway build logs
# Verify package.json dependencies
# Ensure Node.js version compatibility
```

---

## 🎯 Benefits of Separate Services

### ✅ Advantages:
- **Independent Scaling**: Scale each service based on demand
- **Better Isolation**: Issues in one service don't affect others
- **Easier Debugging**: Clear separation of concerns
- **Flexible Deployment**: Deploy services independently
- **Cost Optimization**: Pay only for what you use
- **Better Monitoring**: Service-specific metrics and logs

### 📈 Scalability:
- **Backend**: Scale based on API demand
- **Frontend**: Scale based on user traffic
- **Database**: Scale storage and performance independently

---

## 📞 Support

- **Railway Documentation**: [docs.railway.app](https://docs.railway.app)
- **Railway Discord**: [discord.gg/railway](https://discord.gg/railway)
- **Project Issues**: Create GitHub issues for bugs

---

**Your Essay Competition Management App is now deployed as separate services! 🚀**

## 🔄 Next Steps

1. **Test All Services**: Verify each service works independently
2. **Monitor Performance**: Watch resource usage and performance
3. **Set Up Monitoring**: Add uptime monitoring for each service
4. **Create Documentation**: User guides for each organization
5. **Plan Scaling**: Prepare for multiple organizations
