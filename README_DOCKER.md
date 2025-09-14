# Essay Competition Management System - Docker Setup

This document provides instructions for running the Django + PostgreSQL application using Docker.

## 🐳 Quick Start

### Prerequisites
- Docker
- Docker Compose

### 1. Build and Run
```bash
# Build and start all services
docker-compose up --build

# Run in background
docker-compose up -d --build
```

### 2. Access the Application
- **Django Admin**: http://localhost:8000/admin/
- **API Documentation**: http://localhost:8000/api/docs/
- **Health Check**: http://localhost:8000/health/
- **API Base URL**: http://localhost:8000/api/

### 3. Default Credentials
- **Admin**: username=`admin`, password=`admin123`
- **Sample Users**: username=`<username>`, password=`password123`

## 🔧 Configuration

### Environment Variables
The application uses the following environment variables (configured in `docker-compose.yml`):

```yaml
environment:
  - DEBUG=True
  - DB_NAME=essay_competition_django
  - DB_USER=postgres
  - DB_PASSWORD=postgres123
  - DB_HOST=db
  - DB_PORT=5432
  - SECRET_KEY=django-insecure-777r==0)tg89qfw*#=h+c44t$^kj8eqkiv+=z-$^!z!@^rkscs
  - ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0
  - FRONTEND_URL=http://localhost:3000
```

### Database
- **PostgreSQL 16** running on port `5432`
- **Database Name**: `essay_competition_django`
- **Username**: `postgres`
- **Password**: `postgres123`

## 📋 Available Commands

### Docker Compose Commands
```bash
# Start services
docker-compose up

# Start in background
docker-compose up -d

# Stop services
docker-compose down

# Rebuild and start
docker-compose up --build

# View logs
docker-compose logs

# View logs for specific service
docker-compose logs web
docker-compose logs db

# Execute commands in running container
docker-compose exec web python manage.py shell
docker-compose exec web python manage.py createsuperuser

# Access database
docker-compose exec db psql -U postgres -d essay_competition_django
```

### Django Management Commands
```bash
# Run migrations
docker-compose exec web python manage.py migrate

# Create superuser
docker-compose exec web python manage.py createsuperuser

# Collect static files
docker-compose exec web python manage.py collectstatic

# Run tests
docker-compose exec web python run_tests.py

# Access Django shell
docker-compose exec web python manage.py shell
```

## 🗄️ Data Persistence

### Volumes
- **PostgreSQL Data**: `postgres_data` (persistent)
- **Static Files**: `static_volume` (persistent)
- **Media Files**: `media_volume` (persistent)

### Backup Database
```bash
# Create backup
docker-compose exec db pg_dump -U postgres essay_competition_django > backup.sql

# Restore backup
docker-compose exec -T db psql -U postgres essay_competition_django < backup.sql
```

## 🔍 Monitoring & Debugging

### Health Checks
- **Database**: PostgreSQL readiness check
- **Web**: HTTP health endpoint check

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f web
docker-compose logs -f db
```

### Debug Mode
The application runs in DEBUG mode by default. To disable:
1. Change `DEBUG=True` to `DEBUG=False` in `docker-compose.yml`
2. Rebuild: `docker-compose up --build`

## 🚀 Production Deployment

### Environment Variables for Production
```yaml
environment:
  - DEBUG=False
  - SECRET_KEY=your-production-secret-key
  - ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
  - DB_PASSWORD=your-secure-password
```

### Security Considerations
1. Change default passwords
2. Use strong SECRET_KEY
3. Set DEBUG=False
4. Configure proper ALLOWED_HOSTS
5. Use environment files for sensitive data

## 🧪 Testing

### Run Tests
```bash
# Run all tests
docker-compose exec web python run_tests.py

# Run specific test
docker-compose exec web python manage.py test authentication.tests
```

### API Testing
```bash
# Health check
curl http://localhost:8000/health/

# Login
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# Get participants (with token)
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/participants/
```

## 🗂️ Project Structure

```
Essay_Assist_App/
├── docker-compose.yml          # Docker Compose configuration
├── Dockerfile                  # Django application container
├── .dockerignore              # Files to ignore in Docker build
├── docker_setup.py            # Initial setup script
├── requirements.txt           # Python dependencies
├── manage.py                  # Django management script
├── essay_competition_django/  # Django project settings
├── authentication/            # User authentication app
├── participants/              # Participant management app
├── evaluations/               # Evaluation management app
├── admin_panel/               # Admin panel app
└── README_DOCKER.md           # This file
```

## 🆘 Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Stop existing services
   docker-compose down
   # Or change ports in docker-compose.yml
   ```

2. **Database connection issues**
   ```bash
   # Check if database is running
   docker-compose ps
   # Check database logs
   docker-compose logs db
   ```

3. **Permission issues**
   ```bash
   # Fix file permissions
   sudo chown -R $USER:$USER .
   ```

4. **Build issues**
   ```bash
   # Clean build
   docker-compose down
   docker system prune -f
   docker-compose up --build
   ```

### Reset Everything
```bash
# Stop and remove all containers, networks, and volumes
docker-compose down -v
docker system prune -f

# Rebuild from scratch
docker-compose up --build
```

## 📞 Support

For issues or questions:
1. Check the logs: `docker-compose logs`
2. Verify environment variables
3. Check database connectivity
4. Review Django settings

---

**Happy Coding! 🚀**
