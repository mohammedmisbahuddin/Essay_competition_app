from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from .models import Participant, CompetitionSettings
from .utils import generate_registration_number, clean_participant_data
import io
import csv

User = get_user_model()


class ParticipantTestCase(APITestCase):
    def setUp(self):
        self.admin_user = User.objects.create_user(
            username='admin',
            password='testpass123',
            role='admin',
            full_name='Admin User'
        )
        self.registration_user = User.objects.create_user(
            username='registration',
            password='testpass123',
            role='registration_desk',
            full_name='Registration User'
        )
        self.evaluator_user = User.objects.create_user(
            username='evaluator',
            password='testpass123',
            role='evaluator',
            full_name='Evaluator User'
        )
        
        self.participant = Participant.objects.create(
            registration_number='REG25001',
            full_name='Test Participant',
            email='test@example.com',
            phone='1234567890',
            gender='male',
            age=25,
            qualification='Bachelor',
            father_name='Father Name'
        )

    def test_participant_creation(self):
        """Test participant creation"""
        self.client.force_authenticate(user=self.registration_user)
        data = {
            'full_name': 'New Participant',
            'email': 'new@example.com',
            'phone': '9876543210',
            'gender': 'female',
            'age': 30,
            'qualification': 'Master',
            'father_name': 'Father Name'
        }
        response = self.client.post(reverse('participant_list_create'), data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Participant.objects.filter(full_name='New Participant').exists())

    def test_participant_creation_unauthorized(self):
        """Test participant creation without proper authorization"""
        self.client.force_authenticate(user=self.evaluator_user)
        data = {
            'full_name': 'New Participant',
            'email': 'new@example.com'
        }
        response = self.client.post(reverse('participant_list_create'), data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_participant_list(self):
        """Test participant listing"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(reverse('participant_list_create'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)

    def test_participant_search(self):
        """Test participant search"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(reverse('search_participants'), {'q': 'Test'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('participants', response.data)

    def test_validate_registration_number(self):
        """Test registration number validation"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(reverse('validate_registration', args=['REG25001']))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['valid'])

    def test_validate_invalid_registration_number(self):
        """Test validation of invalid registration number"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(reverse('validate_registration', args=['INVALID']))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(response.data['valid'])

    def test_mark_present(self):
        """Test marking participant as present"""
        self.client.force_authenticate(user=self.registration_user)
        response = self.client.patch(reverse('mark_present', args=[self.participant.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.participant.refresh_from_db()
        self.assertTrue(self.participant.attendance_marked)

    def test_csv_import(self):
        """Test CSV import functionality"""
        self.client.force_authenticate(user=self.admin_user)
        
        # Create CSV data
        csv_data = [
            ['Full Name :', 'Email id :', 'Phone :', 'Gender :', 'Age :'],
            ['John Doe', 'john@example.com', '1234567890', 'male', '25'],
            ['Jane Smith', 'jane@example.com', '0987654321', 'female', '30']
        ]
        
        # Convert to CSV string
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerows(csv_data)
        csv_content = output.getvalue()
        
        # Create a temporary file
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as temp_file:
            temp_file.write(csv_content)
            temp_file.flush()
            
            with open(temp_file.name, 'rb') as csv_file:
                response = self.client.post(
                    reverse('import_csv'),
                    {'csv_file': csv_file},
                    format='multipart'
                )
        
        # Clean up
        import os
        os.unlink(temp_file.name)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)


class ParticipantModelTestCase(TestCase):
    def test_participant_creation(self):
        """Test participant model creation"""
        participant = Participant.objects.create(
            registration_number='REG25001',
            full_name='Test Participant',
            email='test@example.com',
            phone='1234567890',
            gender='male',
            age=25
        )
        self.assertEqual(participant.registration_number, 'REG25001')
        self.assertEqual(participant.full_name, 'Test Participant')
        self.assertFalse(participant.is_spot_registration)

    def test_participant_str_representation(self):
        """Test participant string representation"""
        participant = Participant.objects.create(
            registration_number='REG25001',
            full_name='Test Participant'
        )
        self.assertEqual(str(participant), 'REG25001 - Test Participant')


class ParticipantUtilsTestCase(TestCase):
    def test_generate_registration_number(self):
        """Test registration number generation"""
        reg_number = generate_registration_number()
        self.assertTrue(reg_number.startswith('REG'))
        self.assertEqual(len(reg_number), 9)  # REG + 2 digits year + 4 digits number

    def test_clean_participant_data(self):
        """Test participant data cleaning"""
        raw_data = [
            {
                'Full Name :': 'John Doe',
                'Email id :': 'john@example.com',
                'Phone :': '1234567890',
                'Gender :': 'male',
                'Age :': '25'
            },
            {
                'Full Name :': 'Jane Smith',
                'Email id :': 'jane@example.com',
                'Phone :': '0987654321',
                'Gender :': 'female',
                'Age :': '30'
            }
        ]
        
        cleaned_data = clean_participant_data(raw_data)
        self.assertEqual(len(cleaned_data), 2)
        self.assertEqual(cleaned_data[0]['full_name'], 'John Doe')
        self.assertEqual(cleaned_data[0]['email'], 'john@example.com')
        self.assertEqual(cleaned_data[0]['age'], 25)

    def test_clean_participant_data_invalid_email(self):
        """Test cleaning data with invalid email"""
        raw_data = [
            {
                'Full Name :': 'John Doe',
                'Email id :': 'invalid-email',
                'Phone :': '1234567890',
                'Gender :': 'male',
                'Age :': '25'
            }
        ]
        
        cleaned_data = clean_participant_data(raw_data)
        self.assertEqual(len(cleaned_data), 1)
        self.assertIsNone(cleaned_data[0]['email'])

    def test_clean_participant_data_invalid_age(self):
        """Test cleaning data with invalid age"""
        raw_data = [
            {
                'Full Name :': 'John Doe',
                'Email id :': 'john@example.com',
                'Phone :': '1234567890',
                'Gender :': 'male',
                'Age :': '150'  # Invalid age
            }
        ]
        
        cleaned_data = clean_participant_data(raw_data)
        self.assertEqual(len(cleaned_data), 1)
        self.assertIsNone(cleaned_data[0]['age'])


class CompetitionSettingsTestCase(TestCase):
    def test_settings_creation(self):
        """Test competition settings creation"""
        setting = CompetitionSettings.objects.create(
            setting_key='max_introduction_marks',
            setting_value='10',
            description='Maximum marks for introduction'
        )
        self.assertEqual(setting.setting_key, 'max_introduction_marks')
        self.assertEqual(setting.setting_value, '10')

    def test_settings_str_representation(self):
        """Test settings string representation"""
        setting = CompetitionSettings.objects.create(
            setting_key='max_introduction_marks',
            setting_value='10'
        )
        self.assertEqual(str(setting), 'max_introduction_marks: 10')