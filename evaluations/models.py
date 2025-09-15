from django.db import models
from django.db.models import Sum, F
from authentication.models import User
from participants.models import Participant


class Evaluation(models.Model):
    """
    Model for essay evaluations
    """
    participant_registration_number = models.CharField(max_length=20, db_index=True)
    evaluator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='evaluations')
    
    # Evaluation criteria
    introduction_marks = models.IntegerField(default=0)
    content_marks = models.IntegerField(default=0)
    conclusion_marks = models.IntegerField(default=0)
    handwriting_marks = models.IntegerField(default=0)
    grammar_marks = models.IntegerField(default=0)
    special_points = models.IntegerField(default=0)
    
    # Computed field for total marks
    @property
    def total_marks(self):
        return (
            self.introduction_marks +
            self.content_marks +
            self.conclusion_marks +
            self.handwriting_marks +
            self.grammar_marks +
            self.special_points
        )
    
    comments = models.TextField(blank=True, null=True)
    is_submitted = models.BooleanField(default=False)
    submitted_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Evaluation for {self.participant_registration_number} by {self.evaluator.username}"
    
    @property
    def participant(self):
        """Get the participant object using registration number"""
        try:
            return Participant.objects.get(registration_number=self.participant_registration_number)
        except Participant.DoesNotExist:
            return None
    
    class Meta:
        db_table = 'evaluations'
        unique_together = ['participant_registration_number', 'evaluator']
        ordering = ['-created_at']