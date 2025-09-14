#!/bin/bash

echo "🚀 Starting Essay Competition Backend on Railway..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if express is installed
if [ ! -d "node_modules/express" ]; then
    echo "🔧 Reinstalling dependencies..."
    rm -rf node_modules package-lock.json
    npm install
fi

# Create uploads directory
mkdir -p uploads

echo "✅ Dependencies ready, starting server..."
npm start
