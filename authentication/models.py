from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom user model extending Django's AbstractUser
    """
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('evaluator', 'Evaluator'),
        ('invigilator', 'Invigilator'),
        ('registration_desk', 'Registration Desk'),
    ]
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='evaluator')
    full_name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.username} ({self.role})"
    
    class Meta:
        db_table = 'users'