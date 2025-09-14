#!/usr/bin/env python
"""
Django setup script for Essay Competition Backend
This script helps set up the Django application with initial data
"""

import os
import sys
import django
from django.core.management import execute_from_command_line
from django.contrib.auth import get_user_model

def setup_django():
    """Setup Django application"""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'essay_competition_django.settings')
    django.setup()
    
    print("🚀 Setting up Essay Competition Django Backend...")
    
    # Run migrations
    print("📊 Running database migrations...")
    execute_from_command_line(['manage.py', 'migrate'])
    
    # Create superuser if it doesn't exist
    User = get_user_model()
    if not User.objects.filter(username='admin').exists():
        print("👤 Creating admin user...")
        User.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='admin123',
            role='admin',
            full_name='System Administrator'
        )
        print("✅ Admin user created: username=admin, password=admin123")
    else:
        print("ℹ️  Admin user already exists")
    
    # Create sample competition settings
    from participants.models import CompetitionSettings
    
    settings_data = [
        ('max_introduction_marks', '10', 'Maximum marks for introduction'),
        ('max_content_marks', '20', 'Maximum marks for content'),
        ('max_conclusion_marks', '10', 'Maximum marks for conclusion'),
        ('max_handwriting_marks', '10', 'Maximum marks for handwriting'),
        ('max_grammar_marks', '10', 'Maximum marks for grammar'),
        ('max_special_points', '10', 'Maximum special points'),
        ('competition_name', 'Essay Competition 2025', 'Name of the competition'),
        ('competition_date', '2025-01-15', 'Date of the competition'),
    ]
    
    print("⚙️  Setting up competition settings...")
    for key, value, description in settings_data:
        CompetitionSettings.objects.get_or_create(
            setting_key=key,
            defaults={
                'setting_value': value,
                'description': description
            }
        )
    
    print("✅ Competition settings configured")
    
    # Create sample users
    print("👥 Creating sample users...")
    
    sample_users = [
        ('evaluator1', 'evaluator1@example.com', 'evaluator', 'Evaluator One'),
        ('evaluator2', 'evaluator2@example.com', 'evaluator', 'Evaluator Two'),
        ('registration1', 'registration1@example.com', 'registration_desk', 'Registration Desk One'),
        ('invigilator1', 'invigilator1@example.com', 'invigilator', 'Invigilator One'),
    ]
    
    for username, email, role, full_name in sample_users:
        if not User.objects.filter(username=username).exists():
            User.objects.create_user(
                username=username,
                email=email,
                password='password123',
                role=role,
                full_name=full_name
            )
            print(f"  ✅ Created {role}: {username}")
        else:
            print(f"  ℹ️  {username} already exists")
    
    print("\n🎉 Django setup completed successfully!")
    print("\n📋 Next steps:")
    print("1. Run the development server: python manage.py runserver")
    print("2. Access admin panel: http://localhost:8000/admin/")
    print("3. API documentation: http://localhost:8000/api/")
    print("4. Health check: http://localhost:8000/health/")
    print("\n🔑 Default credentials:")
    print("  Admin: username=admin, password=admin123")
    print("  Sample users: username=<username>, password=password123")

def create_sample_data():
    """Create sample participants and evaluations for testing"""
    print("\n📝 Creating sample data...")
    
    from participants.models import Participant
    from evaluations.models import Evaluation
    from authentication.models import User
    
    # Create sample participants
    participants_data = [
        ('REG25001', 'John Doe', 'john@example.com', '1234567890', 'male', 25, 'Bachelor', 'Robert Doe'),
        ('REG25002', 'Jane Smith', 'jane@example.com', '0987654321', 'female', 28, 'Master', 'Michael Smith'),
        ('REG25003', 'Ahmed Ali', 'ahmed@example.com', '1122334455', 'male', 22, 'Bachelor', 'Hassan Ali'),
        ('REG25004', 'Sarah Johnson', 'sarah@example.com', '5566778899', 'female', 30, 'PhD', 'David Johnson'),
    ]
    
    for reg_num, name, email, phone, gender, age, qualification, father_name in participants_data:
        if not Participant.objects.filter(registration_number=reg_num).exists():
            Participant.objects.create(
                registration_number=reg_num,
                full_name=name,
                email=email,
                phone=phone,
                gender=gender,
                age=age,
                qualification=qualification,
                father_name=father_name,
                is_spot_registration=False
            )
            print(f"  ✅ Created participant: {name} ({reg_num})")
    
    # Create sample evaluations
    evaluator = User.objects.filter(role='evaluator').first()
    if evaluator:
        for participant in Participant.objects.all()[:2]:  # Evaluate first 2 participants
            if not Evaluation.objects.filter(participant=participant, evaluator=evaluator).exists():
                Evaluation.objects.create(
                    participant=participant,
                    evaluator=evaluator,
                    introduction_marks=8,
                    content_marks=15,
                    conclusion_marks=7,
                    handwriting_marks=9,
                    grammar_marks=8,
                    special_points=5,
                    comments='Good essay with clear structure',
                    is_submitted=True
                )
                print(f"  ✅ Created evaluation for: {participant.full_name}")
    
    print("✅ Sample data created successfully!")

def main():
    """Main function"""
    if len(sys.argv) > 1 and sys.argv[1] == '--with-sample-data':
        setup_django()
        create_sample_data()
    else:
        setup_django()
        print("\n💡 Tip: Run with --with-sample-data to create sample participants and evaluations")

if __name__ == '__main__':
    main()
