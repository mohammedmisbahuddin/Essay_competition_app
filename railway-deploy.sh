#!/bin/bash

# Railway Deployment Script for Essay Competition Django Backend
echo "🚀 Deploying to Railway..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "   npm install -g @railway/cli"
    echo "   or visit: https://docs.railway.app/develop/cli"
    exit 1
fi

# Login to Railway (if not already logged in)
echo "🔐 Checking Railway authentication..."
if ! railway whoami &> /dev/null; then
    echo "Please login to Railway:"
    railway login
fi

# Create new project or link to existing
echo "📦 Setting up Railway project..."
if [ ! -f ".railway/project.json" ]; then
    echo "Creating new Railway project..."
    railway project new
else
    echo "Using existing Railway project..."
fi

# Add PostgreSQL database
echo "🗄️ Setting up PostgreSQL database..."
railway add postgresql

# Set environment variables
echo "⚙️ Setting environment variables..."
railway variables set DEBUG=False
railway variables set SECRET_KEY=$(python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())")
railway variables set ALLOWED_HOSTS="*"
railway variables set CORS_ALLOWED_ORIGINS="*"

# Deploy
echo "🚀 Deploying application..."
railway up

echo "✅ Deployment complete!"
echo "🌐 Your application will be available at the Railway URL"
echo "📊 Check logs with: railway logs"
echo "🔧 Manage your app at: https://railway.app"