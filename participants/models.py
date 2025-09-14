from django.db import models
from django.utils import timezone


class Participant(models.Model):
    """
    Model for essay competition participants
    """
    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
    ]
    
    registration_number = models.CharField(max_length=20, unique=True)
    full_name = models.CharField(max_length=100)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True, null=True)
    age = models.IntegerField(blank=True, null=True)
    qualification = models.CharField(max_length=100, blank=True, null=True)
    father_name = models.CharField(max_length=100, blank=True, null=True)
    registration_timestamp = models.DateTimeField(default=timezone.now)
    is_spot_registration = models.BooleanField(default=False)
    attendance_marked = models.BooleanField(default=False)
    attendance_marked_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.registration_number} - {self.full_name}"
    
    class Meta:
        db_table = 'participants'
        ordering = ['-created_at']


class CompetitionSettings(models.Model):
    """
    Model for competition configuration settings
    """
    setting_key = models.CharField(max_length=100, unique=True)
    setting_value = models.TextField()
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.setting_key}: {self.setting_value}"
    
    class Meta:
        db_table = 'competition_settings'


class GoogleSheetsConfig(models.Model):
    """
    Model for Google Sheets integration configuration
    """
    sheet_id = models.CharField(max_length=100)
    sheet_name = models.CharField(max_length=100)
    credentials_json = models.TextField()
    is_active = models.BooleanField(default=True)
    last_sync = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Google Sheets: {self.sheet_name}"
    
    class Meta:
        db_table = 'google_sheets_config'