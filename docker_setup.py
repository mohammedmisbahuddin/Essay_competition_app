#!/usr/bin/env python
"""
Docker setup script for Essay Competition Django Backend
This script runs inside the Docker container to set up the database and create initial data.
"""

import os
import sys
import django
from django.core.management import execute_from_command_line

def setup_django():
    """Set up Django application for Docker"""
    print("🐳 Setting up Django application in Docker...")
    
    # Set up Django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'essay_competition_django.settings')
    django.setup()
    
    # Import after Django setup
    from django.contrib.auth import get_user_model
    from participants.models import CompetitionSettings
    from participants.utils import generate_registration_number
    
    User = get_user_model()
    
    print("📊 Running database migrations...")
    execute_from_command_line(['manage.py', 'migrate'])
    
    # Create admin user if it doesn't exist
    if not User.objects.filter(username='admin').exists():
        print("👤 Creating admin user...")
        admin_user = User.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='admin123',
            role='admin',
            full_name='Admin User'
        )
        print(f"✅ Admin user created: {admin_user.username}")
    else:
        print("ℹ️  Admin user already exists")
    
    # Create sample users
    sample_users = [
        {'username': 'evaluator1', 'email': 'evaluator1@example.com', 'role': 'evaluator', 'full_name': 'Evaluator One'},
        {'username': 'evaluator2', 'email': 'evaluator2@example.com', 'role': 'evaluator', 'full_name': 'Evaluator Two'},
        {'username': 'registration1', 'email': 'registration1@example.com', 'role': 'registration_desk', 'full_name': 'Registration Desk'},
        {'username': 'invigilator1', 'email': 'invigilator1@example.com', 'role': 'invigilator', 'full_name': 'Invigilator One'},
    ]
    
    print("👥 Creating sample users...")
    for user_data in sample_users:
        if not User.objects.filter(username=user_data['username']).exists():
            user = User.objects.create_user(
                username=user_data['username'],
                email=user_data['email'],
                password='password123',
                role=user_data['role'],
                full_name=user_data['full_name']
            )
            print(f"  ✅ Created {user_data['role']}: {user_data['username']}")
        else:
            print(f"  ℹ️  {user_data['username']} already exists")
    
    # Set up competition settings
    print("⚙️  Setting up competition settings...")
    settings_data = [
        {'key': 'competition_name', 'value': 'Annual Essay Competition 2025', 'description': 'Name of the competition'},
        {'key': 'max_participants', 'value': '100', 'description': 'Maximum number of participants allowed'},
        {'key': 'registration_open', 'value': 'true', 'description': 'Whether registration is currently open'},
        {'key': 'competition_date', 'value': '2025-12-15', 'description': 'Date of the competition'},
        {'key': 'registration_deadline', 'value': '2025-12-01', 'description': 'Last date for registration'},
    ]
    
    for setting_data in settings_data:
        setting, created = CompetitionSettings.objects.get_or_create(
            setting_key=setting_data['key'],
            defaults={
                'setting_value': setting_data['value'],
                'description': setting_data['description']
            }
        )
        if created:
            print(f"  ✅ Created setting: {setting_data['key']}")
        else:
            print(f"  ℹ️  Setting {setting_data['key']} already exists")
    
    print("\n🎉 Docker setup completed successfully!")
    print("\n📋 Access Information:")
    print("  🌐 Django Admin: http://localhost:8000/admin/")
    print("  📚 API Docs: http://localhost:8000/api/docs/")
    print("  🔍 Health Check: http://localhost:8000/health/")
    print("\n🔑 Default Credentials:")
    print("  Admin: username=admin, password=admin123")
    print("  Sample users: username=<username>, password=password123")

if __name__ == '__main__':
    setup_django()
