# Railway Deployment Guide

## 🚀 Complete PostgreSQL Migration & Railway Deployment

This guide will help you deploy the Essay Competition Management App to Railway with PostgreSQL database.

---

## 📋 Prerequisites

1. **Railway Account**: Create account at [railway.app](https://railway.app)
2. **GitHub Repository**: Push your code to GitHub
3. **Node.js**: Version 18+ (Railway will handle this)

---

## 🔧 Step 1: Prepare Your Repository

### 1.1 Push to GitHub
```bash
# If not already done
git add .
git commit -m "Add PostgreSQL migration and Railway deployment files"
git push origin main
```

### 1.2 Install PostgreSQL Dependencies
```bash
cd backend
npm install pg
```

---

## 🚂 Step 2: Deploy to Railway

### 2.1 Create Railway Project
1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Railway will automatically detect it's a Node.js project

### 2.2 Add PostgreSQL Database
1. In your Railway project dashboard
2. Click "New" → "Database" → "PostgreSQL"
3. Railway will create a PostgreSQL database
4. Note the `DATABASE_URL` from the database service

### 2.3 Configure Environment Variables
Add these environment variables to your Railway project:

```bash
# Database (Railway will provide this automatically)
DATABASE_URL=postgresql://username:password@host:port/database

# Application
NODE_ENV=production
PORT=5001

# JWT Secret (CHANGE THIS!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# CORS (update with your frontend URL)
CORS_ORIGIN=https://your-frontend-domain.railway.app
```

### 2.4 Deploy Backend
1. Railway will automatically deploy when you push to GitHub
2. Check the deployment logs for any errors
3. Your backend will be available at: `https://your-backend-name.railway.app`

---

## 🎨 Step 3: Deploy Frontend

### 3.1 Create Frontend Service
1. In Railway project dashboard
2. Click "New" → "GitHub Repo"
3. Select the same repository
4. Railway will detect it's a Next.js project

### 3.2 Configure Frontend Environment
Add these environment variables to your frontend service:

```bash
# API URL (your backend URL)
NEXT_PUBLIC_API_URL=https://your-backend-name.railway.app/api

# Other Next.js variables
NODE_ENV=production
```

### 3.3 Deploy Frontend
1. Railway will automatically build and deploy
2. Your frontend will be available at: `https://your-frontend-name.railway.app`

---

## 🗄️ Step 4: Database Migration

### 4.1 Run Migration Script
```bash
# Set your DATABASE_URL
export DATABASE_URL="postgresql://username:password@host:port/database"

# Run migration
cd backend
npm run migrate
```

### 4.2 Verify Migration
Check your Railway PostgreSQL database to ensure:
- ✅ All tables are created
- ✅ Default admin user exists
- ✅ Competition settings are populated
- ✅ Any existing data is migrated

---

## 🔍 Step 5: Testing Deployment

### 5.1 Test Backend
```bash
# Health check
curl https://your-backend-name.railway.app/health

# Should return: {"status":"OK","timestamp":"..."}
```

### 5.2 Test Frontend
1. Visit your frontend URL
2. Try logging in with:
   - **Username**: admin
   - **Password**: admin123
3. Test all major features:
   - ✅ CSV import
   - ✅ Participant management
   - ✅ Evaluation system
   - ✅ Settings update

---

## 🔧 Step 6: Custom Domain (Optional)

### 6.1 Add Custom Domain
1. In Railway project dashboard
2. Go to your service → "Settings" → "Domains"
3. Add your custom domain
4. Update DNS records as instructed

### 6.2 Update Environment Variables
Update `CORS_ORIGIN` and `NEXT_PUBLIC_API_URL` with your custom domains.

---

## 📊 Step 7: Monitoring & Maintenance

### 7.1 Railway Dashboard
- Monitor resource usage
- Check deployment logs
- View database metrics

### 7.2 Database Backups
Railway automatically handles PostgreSQL backups:
- Daily automated backups
- Point-in-time recovery
- Easy restore options

### 7.3 Scaling
- Upgrade Railway plan for more resources
- Add more database storage as needed
- Monitor performance metrics

---

## 🚨 Troubleshooting

### Common Issues:

#### 1. Database Connection Error
```bash
# Check DATABASE_URL format
echo $DATABASE_URL
# Should be: postgresql://username:password@host:port/database
```

#### 2. Migration Fails
```bash
# Check database permissions
# Ensure DATABASE_URL is correct
# Verify PostgreSQL service is running
```

#### 3. Frontend Can't Connect to Backend
```bash
# Check CORS_ORIGIN setting
# Verify NEXT_PUBLIC_API_URL
# Check Railway service URLs
```

#### 4. Build Failures
```bash
# Check Railway build logs
# Verify package.json dependencies
# Ensure Node.js version compatibility
```

---

## 💰 Cost Estimation

### Railway Free Tier:
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

## 🎯 Next Steps

1. **Test Thoroughly**: Verify all functionality works
2. **Monitor Performance**: Watch resource usage
3. **Set Up Monitoring**: Add uptime monitoring
4. **Create Documentation**: User guides for each organization
5. **Plan Scaling**: Prepare for multiple organizations

---

## 📞 Support

- **Railway Documentation**: [docs.railway.app](https://docs.railway.app)
- **Railway Discord**: [discord.gg/railway](https://discord.gg/railway)
- **Project Issues**: Create GitHub issues for bugs

---

**Your Essay Competition Management App is now live on Railway! 🚀**
