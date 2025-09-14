from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


class AuthenticationTestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='admin',
            full_name='Test User'
        )
        self.login_url = reverse('login')
        self.register_url = reverse('register')
        self.profile_url = reverse('profile')
        self.change_password_url = reverse('change_password')

    def test_user_login_success(self):
        """Test successful user login"""
        data = {
            'username': 'testuser',
            'password': 'testpass123'
        }
        response = self.client.post(self.login_url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)
        self.assertIn('user', response.data)

    def test_user_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        data = {
            'username': 'testuser',
            'password': 'wrongpassword'
        }
        response = self.client.post(self.login_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_registration_admin_only(self):
        """Test user registration requires admin access"""
        # Login as admin
        self.client.force_authenticate(user=self.user)
        
        data = {
            'username': 'newuser',
            'email': 'new@example.com',
            'password': 'newpass123',
            'password_confirm': 'newpass123',
            'role': 'evaluator',
            'full_name': 'New User'
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_user_registration_non_admin(self):
        """Test user registration fails for non-admin"""
        # Create non-admin user
        non_admin = User.objects.create_user(
            username='nonadmin',
            password='testpass123',
            role='evaluator',
            full_name='Non Admin'
        )
        self.client.force_authenticate(user=non_admin)
        
        data = {
            'username': 'newuser',
            'email': 'new@example.com',
            'password': 'newpass123',
            'password_confirm': 'newpass123',
            'role': 'evaluator',
            'full_name': 'New User'
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_profile(self):
        """Test getting user profile"""
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('user', response.data)

    def test_change_password(self):
        """Test changing password"""
        self.client.force_authenticate(user=self.user)
        data = {
            'current_password': 'testpass123',
            'new_password': 'newpass123',
            'new_password_confirm': 'newpass123'
        }
        response = self.client.post(self.change_password_url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify password was changed
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('newpass123'))

    def test_change_password_wrong_current(self):
        """Test changing password with wrong current password"""
        self.client.force_authenticate(user=self.user)
        data = {
            'current_password': 'wrongpassword',
            'new_password': 'newpass123',
            'new_password_confirm': 'newpass123'
        }
        response = self.client.post(self.change_password_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class UserModelTestCase(TestCase):
    def test_user_creation(self):
        """Test user model creation"""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='evaluator',
            full_name='Test User'
        )
        self.assertEqual(user.username, 'testuser')
        self.assertEqual(user.role, 'evaluator')
        self.assertTrue(user.check_password('testpass123'))

    def test_user_str_representation(self):
        """Test user string representation"""
        user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            role='evaluator',
            full_name='Test User'
        )
        self.assertEqual(str(user), 'testuser (evaluator)')