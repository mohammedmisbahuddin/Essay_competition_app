#!/bin/bash

echo "🐘 Setting up PostgreSQL for Essay Competition App"
echo "=================================================="

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL first:"
    echo "   macOS: brew install postgresql"
    echo "   Ubuntu: sudo apt-get install postgresql postgresql-contrib"
    echo "   Windows: Download from https://www.postgresql.org/download/"
    exit 1
fi

echo "✅ PostgreSQL is installed"

# Check if PostgreSQL service is running
if ! pg_isready -q; then
    echo "🔄 Starting PostgreSQL service..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew services start postgresql
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo systemctl start postgresql
    fi
    sleep 3
fi

echo "✅ PostgreSQL service is running"

# Create database and user
echo "🔄 Creating database and user..."

# Create database
createdb essay_competition 2>/dev/null || echo "Database 'essay_competition' already exists"

# Create user (if not exists)
psql -d postgres -c "CREATE USER postgres WITH PASSWORD 'password' SUPERUSER;" 2>/dev/null || echo "User 'postgres' already exists"

# Grant privileges
psql -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE essay_competition TO postgres;"

echo "✅ Database setup complete"

# Create .env file
echo "🔄 Creating .env file..."
cat > backend/.env << EOF
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=essay_competition
DB_USER=postgres
DB_PASSWORD=password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-change-this-in-production
JWT_EXPIRES_IN=24h

# Google Sheets Configuration
GOOGLE_SHEETS_API_KEY=your-google-sheets-api-key
GOOGLE_SHEETS_CLIENT_ID=your-google-client-id
GOOGLE_SHEETS_CLIENT_SECRET=your-google-client-secret
GOOGLE_SHEETS_REDIRECT_URI=http://localhost:5000/auth/google/callback

# CORS Configuration
FRONTEND_URL=http://localhost:3000
EOF

echo "✅ .env file created"

echo ""
echo "🎉 PostgreSQL setup complete!"
echo ""
echo "Next steps:"
echo "1. Test the connection: npm run dev"
echo "2. Check the health endpoint: http://localhost:5000/health"
echo "3. If everything works, you're ready for Railway deployment!"
echo ""
