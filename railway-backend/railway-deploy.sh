#!/bin/bash

echo "🚀 Deploying Essay Competition Backend to Railway..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run from backend directory."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Start the application
echo "🚀 Starting application..."
npm start
