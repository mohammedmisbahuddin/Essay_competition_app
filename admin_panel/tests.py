from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from participants.models import CompetitionSettings

User = get_user_model()


class SettingsAPITestCase(APITestCase):
    def setUp(self):
        # Create test users
        self.admin_user = User.objects.create_user(
            username='admin',
            password='admin123',
            role='admin',
            email='admin@test.com'
        )
        
        self.evaluator_user = User.objects.create_user(
            username='evaluator',
            password='evaluator123',
            role='evaluator',
            email='evaluator@test.com'
        )
        
        self.registration_desk_user = User.objects.create_user(
            username='registration_desk',
            password='reg123',
            role='registration_desk',
            email='reg@test.com'
        )
        
        # Create test settings
        CompetitionSettings.objects.create(
            setting_key='competition_name',
            setting_value='Test Competition',
            description='Name of the competition'
        )
        
        CompetitionSettings.objects.create(
            setting_key='max_participants',
            setting_value='100',
            description='Maximum number of participants'
        )

    def test_admin_can_get_settings(self):
        """Test that admin can GET settings"""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('get_settings')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('settings', response.data)
        self.assertIn('competition_name', response.data['settings'])
        self.assertIn('max_participants', response.data['settings'])

    def test_evaluator_can_get_settings(self):
        """Test that evaluator can GET settings"""
        self.client.force_authenticate(user=self.evaluator_user)
        url = reverse('get_settings')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('settings', response.data)
        self.assertIn('competition_name', response.data['settings'])

    def test_registration_desk_cannot_get_settings(self):
        """Test that registration_desk cannot GET settings"""
        self.client.force_authenticate(user=self.registration_desk_user)
        url = reverse('get_settings')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', response.data)

    def test_admin_can_update_settings(self):
        """Test that admin can PUT (update) settings"""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('get_settings')
        
        data = {
            'settings': {
                'competition_name': 'Updated Competition',
                'new_setting': 'new_value'
            }
        }
        
        response = self.client.put(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('message', response.data)
        self.assertIn('updated_settings', response.data)

    def test_evaluator_cannot_update_settings(self):
        """Test that evaluator cannot PUT (update) settings"""
        self.client.force_authenticate(user=self.evaluator_user)
        url = reverse('get_settings')
        
        data = {
            'settings': {
                'competition_name': 'Updated Competition'
            }
        }
        
        response = self.client.put(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', response.data)
        self.assertIn('Admin access required', response.data['error'])

    def test_unauthenticated_user_cannot_access_settings(self):
        """Test that unauthenticated users cannot access settings"""
        url = reverse('get_settings')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
