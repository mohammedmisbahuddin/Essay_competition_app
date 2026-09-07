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


def generate_bca_registration_number(full_name, age=None):
    """
    Generate BCA format registration number: BCA + age(2, optional) + name(2) + uuid(3)
    Format with age: BCA25JOA1B (10 characters total)
    Format without age: BCAJOA1B (8 characters total) - age segment is skipped, not zero-filled
    """
    # Extract first 2 characters of name
    name_part = extract_name_part(full_name, 2)

    # Format age as 2 digits when known; omit the segment entirely when age is missing
    age_str = f"{min(max(age, 0), 99):02d}" if age is not None else ""

    # Generate 3-character UUID part
    uuid_part = str(uuid.uuid4())[:3].upper()

    # Combine: BCA + age (if known) + name + uuid
    registration_number = f"BCA{age_str}{name_part}{uuid_part}"

    # Ensure uniqueness, bounded to avoid a runaway loop
    attempts = 0
    while Participant.objects.filter(registration_number=registration_number).exists():
        uuid_part = str(uuid.uuid4())[:3].upper()
        registration_number = f"BCA{age_str}{name_part}{uuid_part}"
        attempts += 1
        if attempts > 20:
            raise RuntimeError('Unable to generate a unique registration number after multiple attempts')

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
    Uses the BCA format whenever a name is available (age is optional and simply
    omitted from the id when missing). Only falls back to the original REG
    format when there's no name to build a BCA id from.
    """
    if full_name:
        return generate_bca_registration_number(full_name, age)
    else:
        return generate_registration_number_fallback()


# Maps a logical field to the header names (normalized: trimmed, lowercased,
# trailing ':' stripped) that identify it in a Google Form / CSV export. Kept
# as a list so both the form's raw column headers and API-style snake_case
# keys resolve to the same field.
FIELD_ALIASES = {
    'full_name': ['full name', 'full_name'],
    'email': ['email id', 'email', 'email_id'],
    'phone': ['phone', 'phone_number'],
    'gender': ['gender'],
    'age': ['age'],
    'qualification': ['qualification'],
    'father_name': ["father's name", 'fathername', 'father_name'],
    'timestamp': ['column 1', 'timestamp_of_registration', 'timestamp'],
}


def _normalize_key(key):
    """
    Normalize a raw CSV/form header so minor export differences (a leading
    UTF-8 BOM on the first column, mismatched case, a trailing ' :' vs ':')
    don't cause the whole row to be silently skipped.
    """
    if key is None:
        return ''
    return key.strip().lstrip('﻿').rstrip(': ').strip().lower()


def _get_field(normalized_row, field):
    for alias in FIELD_ALIASES[field]:
        value = normalized_row.get(alias)
        if value not in (None, ''):
            return value
    return None


def clean_participant_data(raw_data):
    """
    Clean and validate participant data from CSV
    """
    cleaned_data = []
    seen_emails = set()
    seen_phones = set()

    for row in raw_data:
        normalized_row = {_normalize_key(key): value for key, value in row.items()}

        # Skip empty rows
        full_name = (_get_field(normalized_row, 'full_name') or '').strip()
        if not full_name:
            continue

        participant = {
            'full_name': full_name,
            'email': (_get_field(normalized_row, 'email') or '').strip().lower(),
            'phone': (_get_field(normalized_row, 'phone') or '').strip(),
            'gender': (_get_field(normalized_row, 'gender') or '').strip().lower(),
            'age': None,
            'qualification': (_get_field(normalized_row, 'qualification') or '').strip(),
            'father_name': (_get_field(normalized_row, 'father_name') or '').strip(),
            'registration_timestamp': None
        }

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
            age_value = _get_field(normalized_row, 'age')
            if age_value:
                age = int(age_value)
                if 1 <= age <= 100:
                    participant['age'] = age
        except (ValueError, TypeError):
            pass

        # Parse registration timestamp
        timestamp_value = _get_field(normalized_row, 'timestamp')
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
