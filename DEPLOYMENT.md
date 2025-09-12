# Essay Competition Management App - Deployment Guide

## Quick Start

### Option 1: Docker Deployment (Recommended)

1. **Clone and setup:**
   ```bash
   git clone <repository-url>
   cd Essay_Assist_App
   chmod +x setup.sh
   ./setup.sh
   ```

2. **Configure environment:**
   ```bash
   # Edit backend/.env
   nano backend/.env
   ```

3. **Deploy with Docker:**
   ```bash
   docker-compose up -d
   ```

4. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Health Check: http://localhost:5000/health

### Option 2: Manual Deployment

1. **Install dependencies:**
   ```bash
   ./setup.sh
   ```

2. **Configure environment variables:**
   ```bash
   # Backend configuration
   cp backend/env.example backend/.env
   nano backend/.env
   
   # Frontend configuration
   echo "NEXT_PUBLIC_API_URL=http://localhost:5000/api" > frontend/.env.local
   ```

3. **Start the application:**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm run build
   npm start
   ```

## Environment Configuration

### Backend Environment Variables

Create `backend/.env` with the following variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=production

# Database Configuration
DB_PATH=./database/competition.db

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h

# Google Sheets Configuration (Optional)
GOOGLE_SHEETS_API_KEY=your-google-sheets-api-key
GOOGLE_SHEETS_CLIENT_ID=your-google-client-id
GOOGLE_SHEETS_CLIENT_SECRET=your-google-client-secret
GOOGLE_SHEETS_REDIRECT_URI=http://your-domain.com/auth/google/callback

# CORS Configuration
FRONTEND_URL=http://your-domain.com
```

### Frontend Environment Variables

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://your-domain.com/api
```

## Google Sheets Integration Setup

1. **Enable Google Sheets API:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable Google Sheets API
   - Create credentials (API Key or Service Account)

2. **Configure in the app:**
   - Login as admin
   - Go to Admin → Google Sheets Configuration
   - Enter your Google Sheets URL
   - Test the connection

3. **Google Sheets Format:**
   Your Google Sheet should have the following columns:
   ```
   A: Full Name
   B: Email
   C: Phone
   D: Gender (male/female/other)
   E: Date of Birth
   F: Institution
   G: Address
   ```

## Production Deployment

### Using Docker (Recommended)

1. **Build and deploy:**
   ```bash
   docker-compose -f docker-compose.yml up -d
   ```

2. **Using Docker Compose with PostgreSQL:**
   ```bash
   docker-compose --profile production up -d
   ```

### Using PM2 (Node.js Process Manager)

1. **Install PM2:**
   ```bash
   npm install -g pm2
   ```

2. **Create ecosystem file:**
   ```javascript
   // ecosystem.config.js
   module.exports = {
     apps: [{
       name: 'essay-competition-backend',
       script: './backend/src/server.js',
       cwd: './',
       env: {
         NODE_ENV: 'production',
         PORT: 5000
       }
     }, {
       name: 'essay-competition-frontend',
       script: 'npm',
       args: 'start',
       cwd: './frontend',
       env: {
         NODE_ENV: 'production',
         PORT: 3000
       }
     }]
   };
   ```

3. **Start with PM2:**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

### Using Nginx as Reverse Proxy

1. **Install Nginx:**
   ```bash
   sudo apt update
   sudo apt install nginx
   ```

2. **Create Nginx configuration:**
   ```nginx
   # /etc/nginx/sites-available/essay-competition
   server {
       listen 80;
       server_name your-domain.com;

       # Frontend
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       # Backend API
       location /api {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. **Enable the site:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/essay-competition /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

## Security Considerations

1. **Change default credentials:**
   - Update admin password immediately
   - Use strong JWT secrets
   - Enable HTTPS in production

2. **Database security:**
   - Use PostgreSQL for production
   - Regular backups
   - Access restrictions

3. **Environment variables:**
   - Never commit .env files
   - Use environment-specific configurations
   - Rotate secrets regularly

## Monitoring and Maintenance

1. **Health checks:**
   - Backend: `GET /health`
   - Monitor logs: `docker-compose logs -f`

2. **Backup strategy:**
   ```bash
   # Database backup
   cp database/competition.db backups/competition-$(date +%Y%m%d).db
   
   # Full backup
   tar -czf backup-$(date +%Y%m%d).tar.gz database/ logs/
   ```

3. **Updates:**
   ```bash
   # Pull latest changes
   git pull origin main
   
   # Rebuild and restart
   docker-compose down
   docker-compose up -d --build
   ```

## Troubleshooting

### Common Issues

1. **Port already in use:**
   ```bash
   # Find process using port
   lsof -i :3000
   lsof -i :5000
   
   # Kill process
   kill -9 <PID>
   ```

2. **Database connection issues:**
   - Check database file permissions
   - Verify DB_PATH in .env
   - Ensure database directory exists

3. **Google Sheets API issues:**
   - Verify API key is correct
   - Check sheet permissions
   - Ensure sheet URL format is correct

### Logs

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f app

# View backend logs
tail -f logs/backend.log

# View frontend logs
tail -f logs/frontend.log
```

## Support

For issues and questions:
1. Check the logs first
2. Verify environment configuration
3. Test API endpoints manually
4. Check database integrity

## Default Access

- **URL:** http://localhost:3000
- **Admin Username:** admin
- **Admin Password:** admin123

**⚠️ Important:** Change the default admin password immediately after first login!

