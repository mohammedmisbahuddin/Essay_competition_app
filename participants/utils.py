import re
import uuid
from datetime import datetime
from django.db import models
from django.utils import timezone
from .models import Participant


def extract_name_part(full_name, length):
    """
    Extract first N characters from full name, handling edge cases
    """
    if not full_name:
        return "XX"  # Default for missing names
    
    # Clean and extract first characters (remove spaces, special chars)
    clean_name = re.sub(r'[^A-Za-z]', '', full_name.upper())
    
    if len(clean_name) < length:
        return clean_name.ljust(length, 'X')  # Pad with X
    
    return clean_name[:length]


def generate_pcwt_registration_number(full_name, age):
    """
    Generate PCWT format registration number: PCWT + age(2) + name(2) + uuid(5)
    Format: PCWT25JOA1B2C (13 characters total)
    """
    # Extract first 2 characters of name
    name_part = extract_name_part(full_name, 2)
    
    # Format age as 2 digits
    age_str = f"{age:02d}" if age else "00"
    
    # Generate 5-character UUID part
    uuid_part = str(uuid.uuid4())[:5].upper()
    
    # Combine: PCWT + age + name + uuid
    registration_number = f"PCWT{age_str}{name_part}{uuid_part}"
    
    # Ensure uniqueness (very unlikely to need retry with 5-char UUID)
    while Participant.objects.filter(registration_number=registration_number).exists():
        uuid_part = str(uuid.uuid4())[:5].upper()
        registration_number = f"PCWT{age_str}{name_part}{uuid_part}"
    
    return registration_number


def generate_registration_number_fallback():
    """
    Generate fallback registration number (original format)
    """
    prefix = 'REG'
    year = datetime.now().year % 100  # Last 2 digits of year
    
    # Get the last registration number for this year
    last_reg = Participant.objects.filter(
        registration_number__startswith=f"{prefix}{year:02d}"
    ).order_by('-id').first()
    
    next_number = 1
    if last_reg and last_reg.registration_number:
        try:
            last_number = int(last_reg.registration_number[-4:])
            next_number = last_number + 1
        except (ValueError, IndexError):
            next_number = 1
    
    # Format as REG25001, REG25002, etc.
    registration_number = f"{prefix}{year:02d}{next_number:04d}"
    
    # Double-check uniqueness
    while Participant.objects.filter(registration_number=registration_number).exists():
        next_number += 1
        registration_number = f"{prefix}{year:02d}{next_number:04d}"
    
    return registration_number


def generate_registration_number(full_name=None, age=None):
    """
    Main function to generate registration number with fallback
    Uses new PCWT format if name and age are provided, otherwise falls back to original format
    """
    if full_name and age is not None:
        return generate_pcwt_registration_number(full_name, age)
    else:
        return generate_registration_number_fallback()


def clean_participant_data(raw_data):
    """
    Clean and validate participant data from CSV
    """
    cleaned_data = []
    seen_emails = set()
    seen_phones = set()
    
    for row in raw_data:
        # Skip empty rows
        if not (row.get('Full Name :') or row.get('full_name')):
            continue
        
        participant = {
            'full_name': (row.get('Full Name :') or row.get('full_name', '')).strip(),
            'email': (row.get('Email id :') or row.get('email_id', '')).strip().lower(),
            'phone': (row.get('Phone :') or row.get('phone', '')).strip(),
            'gender': (row.get('Gender :') or row.get('gender', '')).strip().lower(),
            'age': None,
            'qualification': (row.get('Qualification :') or row.get('qualification', '')).strip(),
            'father_name': (row.get("Father's Name :") or row.get('fathername', '')).strip(),
            'registration_timestamp': None
        }
        
        # Validate required fields
        if not participant['full_name']:
            continue
        
        # Check for duplicates based on email or phone
        if participant['email'] and participant['email'] in seen_emails:
            continue
        if participant['phone'] and participant['phone'] in seen_phones:
            continue
        
        # Validate gender
        if participant['gender'] and participant['gender'] not in ['male', 'female', 'other']:
            participant['gender'] = 'other'
        
        # Validate email format
        if participant['email'] and not is_valid_email(participant['email']):
            participant['email'] = None
        
        # Validate phone format
        if participant['phone'] and not is_valid_phone(participant['phone']):
            participant['phone'] = None
        
        # Parse age
        try:
            age_value = row.get('Age :') or row.get('age')
            if age_value:
                age = int(age_value)
                if 1 <= age <= 100:
                    participant['age'] = age
        except (ValueError, TypeError):
            pass
        
        # Parse registration timestamp
        timestamp_value = row.get('Column 1') or row.get('timestamp_of_registration')
        if timestamp_value:
            try:
                # Handle different timestamp formats
                timestamp_str = str(timestamp_value).strip()
                if timestamp_str:
                    # Try parsing as M/D/YYYY H:MM:SS format first
                    try:
                        parsed_date = datetime.strptime(timestamp_str, '%m/%d/%Y %H:%M:%S')
                        participant['registration_timestamp'] = parsed_date
                    except ValueError:
                        # Try ISO format as fallback
                        try:
                            parsed_date = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                            participant['registration_timestamp'] = parsed_date
                        except ValueError:
                            # If all parsing fails, use current time
                            participant['registration_timestamp'] = timezone.now()
            except (ValueError, TypeError):
                # If all parsing fails, use current time
                participant['registration_timestamp'] = timezone.now()
        
        cleaned_data.append(participant)
        
        if participant['email']:
            seen_emails.add(participant['email'])
        if participant['phone']:
            seen_phones.add(participant['phone'])
    
    return cleaned_data


def is_valid_email(email):
    """
    Validate email format
    """
    email_regex = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
    return re.match(email_regex, email) is not None


def is_valid_phone(phone):
    """
    Validate phone format
    """
    phone_regex = r'^[\+]?[1-9][\d]{0,15}$'
    cleaned_phone = re.sub(r'[\s\-\(\)]', '', phone)
    return re.match(phone_regex, cleaned_phone) is not None


def generate_statistics():
    """
    Generate statistics for admin dashboard
    """
    stats = {}
    
    # Total participants
    stats['total_participants'] = Participant.objects.count()
    
    # Participants by gender
    gender_stats = Participant.objects.values('gender').annotate(
        count=models.Count('id')
    ).order_by('gender')
    stats['gender_distribution'] = list(gender_stats)
    
    # Spot registrations
    stats['spot_registrations'] = Participant.objects.filter(
        is_spot_registration=True
    ).count()
    
    return stats
