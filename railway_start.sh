#!/bin/bash

# Railway startup script for Django + PostgreSQL
echo "🚀 Starting Django application on Railway..."

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
python -c "
import time
import os
import django
from django.db import connection
from django.core.exceptions import ImproperlyConfigured

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'essay_competition_django.settings')
django.setup()

max_retries = 30
retry_count = 0

while retry_count < max_retries:
    try:
        connection.ensure_connection()
        print('✅ Database connection successful!')
        break
    except Exception as e:
        retry_count += 1
        print(f'⏳ Database connection attempt {retry_count}/{max_retries} failed: {e}')
        time.sleep(2)

if retry_count >= max_retries:
    print('❌ Failed to connect to database after 30 attempts')
    exit(1)
"

# Run migrations
echo "📊 Running database migrations..."
python manage.py migrate

# Collect static files
echo "📁 Collecting static files..."
python manage.py collectstatic --noinput

# Create superuser if it doesn't exist
echo "👤 Setting up admin user..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
    print('✅ Admin user created')
else:
    print('ℹ️ Admin user already exists')
"

# Start the application
echo "🌐 Starting Gunicorn server..."
exec gunicorn essay_competition_django.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 120
