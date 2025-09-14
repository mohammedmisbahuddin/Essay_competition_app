# 🚀 Railway Deployment Guide - Essay Management System

## 📋 Deployment Steps Overview

1. **Step 1**: Deploy PostgreSQL Database
2. **Step 2**: Deploy Backend API
3. **Step 3**: Deploy Frontend
4. **Step 4**: Configure Environment Variables
5. **Step 5**: Test Complete System

---

## 🗄️ **STEP 1: Deploy PostgreSQL Database**

### 1.1 Login to Railway
```bash
railway login
```

### 1.2 Create New Project
```bash
railway new
# Name: essay-competition-db
```

### 1.3 Add PostgreSQL Service
```bash
railway add postgresql
```

### 1.4 Get Database Connection Details
```bash
railway variables
```

### 1.5 Test Database Connection
```bash
# Note down these variables:
# PGHOST
# PGPORT  
# PGUSER
# PGPASSWORD
# PGDATABASE
```

### 1.6 Initialize Database Schema
```bash
# Connect to Railway PostgreSQL and run schema
railway connect postgresql
# Then run: \i database/schema_postgres.sql
```

---

## 🔧 **STEP 2: Deploy Backend API**

### 2.1 Create Backend Service
```bash
railway add
# Select: Deploy from GitHub repo
# Choose: backend folder
```

### 2.2 Configure Environment Variables
```bash
railway variables set NODE_ENV=production
railway variables set PORT=5001
railway variables set JWT_SECRET=your-super-secret-jwt-key-here
railway variables set JWT_EXPIRES_IN=24h

# Database variables (from Step 1)
railway variables set DB_HOST=$PGHOST
railway variables set DB_PORT=$PGPORT
railway variables set DB_USER=$PGUSER
railway variables set DB_PASSWORD=$PGPASSWORD
railway variables set DB_NAME=$PGDATABASE
```

### 2.3 Deploy Backend
```bash
railway up
```

### 2.4 Test Backend API
```bash
# Get backend URL
railway domain

# Test health endpoint
curl https://your-backend-url.railway.app/health
```

---

## 🎨 **STEP 3: Deploy Frontend**

### 3.1 Create Frontend Service
```bash
railway add
# Select: Deploy from GitHub repo
# Choose: frontend folder
```

### 3.2 Configure Frontend Environment
```bash
# Set backend URL
railway variables set NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app/api
```

### 3.3 Deploy Frontend
```bash
railway up
```

### 3.4 Test Frontend
```bash
# Get frontend URL
railway domain

# Open in browser and test
```

---

## ✅ **Validation Steps**

### After Each Step, Validate:

#### Database Validation
- [ ] PostgreSQL service running
- [ ] Database connection successful
- [ ] Schema tables created
- [ ] Can insert/query data

#### Backend Validation
- [ ] Backend service running
- [ ] Health endpoint responding
- [ ] Database connection working
- [ ] Authentication working
- [ ] All API endpoints accessible

#### Frontend Validation
- [ ] Frontend service running
- [ ] Can access login page
- [ ] Can login with admin credentials
- [ ] Can access admin dashboard
- [ ] CSV import working
- [ ] All features functional

---

## 🔧 **Troubleshooting**

### Common Issues:
1. **Database Connection**: Check environment variables
2. **CORS Issues**: Update CORS settings
3. **Build Failures**: Check package.json scripts
4. **Environment Variables**: Verify all required vars set

### Debug Commands:
```bash
# Check service logs
railway logs

# Check service status
railway status

# Check environment variables
railway variables

# Connect to database
railway connect postgresql
```

---

## 📊 **Final Validation Checklist**

- [ ] Database: PostgreSQL running and accessible
- [ ] Backend: All API endpoints working
- [ ] Frontend: Complete UI accessible
- [ ] Authentication: Login/logout working
- [ ] CSV Import: File upload working
- [ ] Admin Panel: All features functional
- [ ] Performance: Response times acceptable
- [ ] Security: HTTPS enabled, secure headers

---

## 🎯 **Expected URLs After Deployment**

- **Frontend**: `https://your-frontend-url.railway.app`
- **Backend API**: `https://your-backend-url.railway.app`
- **Database**: Internal Railway network

---

**Ready to start? Let's begin with Step 1!** 🚀
