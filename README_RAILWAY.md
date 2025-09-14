# Railway Deployment Guide - Essay Competition Django Backend

This guide provides step-by-step instructions for deploying the Django + PostgreSQL application to Railway.

## 🚀 Quick Deploy to Railway

### Option 1: One-Click Deploy (Recommended)
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/deploy)

### Option 2: Manual Deploy

#### Prerequisites
1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **Railway CLI**: Install from [docs.railway.app](https://docs.railway.app/develop/cli)
3. **Git Repository**: Push your code to GitHub/GitLab

#### Step 1: Install Railway CLI
```bash
# Install via npm
npm install -g @railway/cli

# Or via curl
curl -fsSL https://railway.app/install.sh | sh
```

#### Step 2: Login to Railway
```bash
railway login
```

#### Step 3: Deploy
```bash
# Clone and navigate to project
git clone <your-repo-url>
cd Essay_Assist_App

# Deploy using our script
chmod +x railway-deploy.sh
./railway-deploy.sh
```

## 🔧 Manual Railway Setup

### 1. Create New Project
```bash
railway project new
```

### 2. Add PostgreSQL Database
```bash
railway add postgresql
```

### 3. Set Environment Variables
```bash
# Required variables
railway variables set DEBUG=False
railway variables set SECRET_KEY=$(python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())")
railway variables set ALLOWED_HOSTS="*"
railway variables set CORS_ALLOWED_ORIGINS="*"

# Optional variables
railway variables set FRONTEND_URL="https://your-frontend-domain.com"
```

### 4. Deploy
```bash
railway up
```

## 🌐 Access Your Application

After deployment, Railway will provide you with:
- **Application URL**: `https://your-app-name.railway.app`
- **Database URL**: Available in Railway dashboard

### Key Endpoints
- **Health Check**: `https://your-app-name.railway.app/health/`
- **API Documentation**: `https://your-app-name.railway.app/api/docs/`
- **Django Admin**: `https://your-app-name.railway.app/admin/`
- **API Base**: `https://your-app-name.railway.app/api/`

### Default Credentials
- **Admin**: username=`admin`, password=`admin123`
- **Sample Users**: Various roles with password=`password123`

## 📊 Monitoring & Management

### View Logs
```bash
railway logs
```

### Connect to Database
```bash
railway connect postgresql
```

### Scale Application
```bash
railway scale web=1
```

## 🔒 Security Considerations

### Production Settings
1. **Change Default Passwords**: Update admin and sample user passwords
2. **Set Strong Secret Key**: Use a secure SECRET_KEY
3. **Configure CORS**: Set specific CORS_ALLOWED_ORIGINS
4. **Enable HTTPS**: Railway provides HTTPS by default
5. **Database Security**: Railway handles database security

### Environment Variables for Production
```bash
# Security
SECRET_KEY=your-super-secret-key-here
DEBUG=False
ALLOWED_HOSTS=your-domain.com,*.railway.app

# CORS
CORS_ALLOWED_ORIGINS=https://your-frontend-domain.com

# Database (automatically set by Railway)
DATABASE_URL=postgresql://user:pass@host:port/dbname
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Build Failures
```bash
# Check build logs
railway logs --service web

# Common fixes
- Ensure all dependencies are in requirements.txt
- Check Dockerfile syntax
- Verify Python version compatibility
```

#### 2. Database Connection Issues
```bash
# Check database status
railway status

# Verify environment variables
railway variables
```

#### 3. Static Files Not Loading
```bash
# Ensure collectstatic runs during deployment
# Check STATIC_URL and STATIC_ROOT settings
```

### Debug Commands
```bash
# View all services
railway status

# Check environment variables
railway variables

# View detailed logs
railway logs --follow

# Connect to running container
railway shell
```

## 📈 Performance Optimization

### Database Optimization
- Use Railway's PostgreSQL addon
- Configure connection pooling
- Monitor query performance

### Application Optimization
- Enable Gunicorn workers
- Configure static file serving
- Use CDN for static assets

### Monitoring
- Set up Railway metrics
- Monitor response times
- Track error rates

## 🔄 CI/CD Integration

### GitHub Actions Example
```yaml
name: Deploy to Railway
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install -g @railway/cli
      - run: railway login --token ${{ secrets.RAILWAY_TOKEN }}
      - run: railway up
```

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Django Deployment Guide](https://docs.djangoproject.com/en/stable/howto/deployment/)
- [PostgreSQL on Railway](https://docs.railway.app/databases/postgresql)
- [Environment Variables](https://docs.railway.app/deploy/environment-variables)

## 🆘 Support

If you encounter issues:
1. Check Railway logs: `railway logs`
2. Verify environment variables: `railway variables`
3. Test locally with Docker: `docker-compose up`
4. Check Railway status page: [status.railway.app](https://status.railway.app)

---

**Happy Deploying! 🚀**
