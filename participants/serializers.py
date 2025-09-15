from rest_framework import serializers
from .models import Participant, CompetitionSettings, GoogleSheetsConfig


class ParticipantSerializer(serializers.ModelSerializer):
    """
    Serializer for Participant model
    """
    class Meta:
        model = Participant
        fields = [
            'id', 'registration_number', 'full_name', 'email', 'phone',
            'gender', 'age', 'qualification', 'father_name',
            'registration_timestamp', 'is_spot_registration',
            'attendance_marked', 'attendance_marked_at', 'created_at'
        ]
        read_only_fields = ['id', 'registration_number', 'created_at']


class ParticipantCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating participants (spot registration)
    """
    class Meta:
        model = Participant
        fields = [
            'registration_number', 'full_name', 'email', 'phone', 'gender', 'age',
            'qualification', 'father_name'
        ]
        read_only_fields = ['registration_number']
    
    def validate_gender(self, value):
        if value and value not in ['male', 'female', 'other']:
            raise serializers.ValidationError('Invalid gender value')
        return value
    
    def validate_age(self, value):
        if value and (value < 1 or value > 100):
            raise serializers.ValidationError('Age must be between 1 and 100')
        return value


class ParticipantSearchSerializer(serializers.Serializer):
    """
    Serializer for participant search
    """
    q = serializers.CharField(required=False, allow_blank=True)
    page = serializers.IntegerField(default=1, min_value=1)
    limit = serializers.IntegerField(default=50, min_value=1, max_value=100)
    gender = serializers.CharField(required=False, allow_blank=True)
    search = serializers.CharField(required=False, allow_blank=True)


class CompetitionSettingsSerializer(serializers.ModelSerializer):
    """
    Serializer for Competition Settings
    """
    class Meta:
        model = CompetitionSettings
        fields = ['setting_key', 'setting_value', 'description']


class GoogleSheetsConfigSerializer(serializers.ModelSerializer):
    """
    Serializer for Google Sheets Configuration
    """
    class Meta:
        model = GoogleSheetsConfig
        fields = ['sheet_id', 'sheet_name', 'credentials_json', 'is_active', 'last_sync']
