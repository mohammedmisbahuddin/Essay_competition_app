from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from .models import Evaluation
from participants.models import Participant

User = get_user_model()


class EvaluationTestCase(APITestCase):
    def setUp(self):
        self.admin_user = User.objects.create_user(
            username='admin',
            password='testpass123',
            role='admin',
            full_name='Admin User'
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
            age=25
        )

    def test_evaluation_creation(self):
        """Test evaluation creation"""
        self.client.force_authenticate(user=self.evaluator_user)
        data = {
            'participant': self.participant.id,
            'introduction_marks': 8,
            'content_marks': 15,
            'conclusion_marks': 7,
            'handwriting_marks': 9,
            'grammar_marks': 8,
            'special_points': 5,
            'comments': 'Good essay'
        }
        response = self.client.post(reverse('evaluation_list_create'), data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_evaluation_submit(self):
        """Test evaluation submission"""
        self.client.force_authenticate(user=self.evaluator_user)
        data = {
            'participant_id': self.participant.id,
            'introduction_marks': 8,
            'content_marks': 15,
            'conclusion_marks': 7,
            'handwriting_marks': 9,
            'grammar_marks': 8,
            'special_points': 5,
            'comments': 'Good essay'
        }
        response = self.client.post(reverse('submit_evaluation'), data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class EvaluationModelTestCase(TestCase):
    def test_evaluation_total_marks(self):
        """Test evaluation total marks calculation"""
        user = User.objects.create_user(
            username='evaluator',
            password='testpass123',
            role='evaluator',
            full_name='Evaluator User'
        )
        participant = Participant.objects.create(
            registration_number='REG25001',
            full_name='Test Participant'
        )
        
        evaluation = Evaluation.objects.create(
            participant=participant,
            evaluator=user,
            introduction_marks=10,
            content_marks=20,
            conclusion_marks=10,
            handwriting_marks=10,
            grammar_marks=10,
            special_points=10
        )
        
        self.assertEqual(evaluation.total_marks, 70)