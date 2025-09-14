# Railway Deployment Fix Guide

## 🚨 Issue: PostgreSQL Connection Error

**Error:** `django.db.utils.OperationalError: could not connect to server`

**Root Cause:** Missing `DATABASE_URL` environment variable in Railway

## 🔧 Step-by-Step Fix

### Step 1: Add PostgreSQL Database to Railway

#### Option A: Via Railway Dashboard (Recommended)
1. Go to [railway.app](https://railway.app)
2. Open your project: `reliable-tranquility`
3. Click **"New Service"**
4. Select **"Database"** → **"PostgreSQL"**
5. Railway will automatically create the `DATABASE_URL` environment variable

#### Option B: Via CLI
```bash
# Add PostgreSQL database
railway add --database postgres

# Verify DATABASE_URL is set
railway variables
```

### Step 2: Verify Environment Variables

After adding PostgreSQL, you should see:
```bash
railway variables
```

Expected output should include:
- `DATABASE_URL=postgresql://postgres:password@host:port/database`
- `DEBUG=False`
- `ALLOWED_HOSTS=*`
- `CORS_ALLOWED_ORIGINS=*`

### Step 3: Deploy with Fixed Configuration

```bash
# Deploy the updated configuration
railway up
```

### Step 4: Monitor Deployment

```bash
# Check deployment logs
railway logs

# Check service status
railway status
```

## 🛠️ What Was Fixed

### 1. **Railway Startup Script** (`railway_start.sh`)
- Added database connection retry logic
- Ensures migrations run before starting the app
- Creates admin user automatically
- Handles Railway's dynamic PORT environment variable

### 2. **Updated Railway Configuration** (`railway.json`)
- Uses the robust startup script
- Includes proper health checks
- Configured for production deployment

### 3. **Enhanced Dockerfile**
- Copies and makes startup script executable
- Optimized for Railway deployment
- Includes proper health checks

## 🔍 Troubleshooting

### If DATABASE_URL is still missing:
1. **Check Railway Dashboard**: Ensure PostgreSQL service is running
2. **Re-add Database**: Delete and re-add PostgreSQL service
3. **Manual Variable**: Add `DATABASE_URL` manually in Railway dashboard

### If migrations fail:
1. **Check Logs**: `railway logs` to see specific error
2. **Database Permissions**: Ensure database user has CREATE privileges
3. **Connection String**: Verify `DATABASE_URL` format is correct

### If app still won't start:
1. **Check Health Endpoint**: Visit `https://your-app.railway.app/health/`
2. **Review Logs**: Look for specific error messages
3. **Database Connection**: Test connection manually

## ✅ Expected Result

After successful deployment:
- **Health Check**: `https://your-app.railway.app/health/` returns `{"status": "OK"}`
- **Admin Panel**: `https://your-app.railway.app/admin/` accessible
- **API Docs**: `https://your-app.railway.app/api/docs/` working
- **Database**: All tables created and migrations applied

## 🚀 Quick Deploy Command

```bash
# One-command deployment (after adding PostgreSQL)
railway up && railway logs
```

## 📞 Support

If issues persist:
1. Check Railway status: [status.railway.app](https://status.railway.app)
2. Review Railway docs: [docs.railway.app](https://docs.railway.app)
3. Check project logs: `railway logs --follow`
