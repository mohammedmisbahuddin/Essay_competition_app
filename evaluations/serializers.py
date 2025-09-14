from rest_framework import serializers
from .models import Evaluation
from participants.serializers import ParticipantSerializer
from authentication.serializers import UserSerializer


class EvaluationSerializer(serializers.ModelSerializer):
    """
    Serializer for Evaluation model
    """
    participant = ParticipantSerializer(read_only=True)
    evaluator = UserSerializer(read_only=True)
    total_marks = serializers.ReadOnlyField()
    
    class Meta:
        model = Evaluation
        fields = [
            'id', 'participant', 'evaluator', 'introduction_marks',
            'content_marks', 'conclusion_marks', 'handwriting_marks',
            'grammar_marks', 'special_points', 'total_marks',
            'comments', 'is_submitted', 'submitted_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'participant', 'evaluator', 'total_marks', 'created_at', 'updated_at']


class EvaluationCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating evaluations
    """
    class Meta:
        model = Evaluation
        fields = [
            'participant', 'introduction_marks', 'content_marks',
            'conclusion_marks', 'handwriting_marks', 'grammar_marks',
            'special_points', 'comments'
        ]
    
    def validate_introduction_marks(self, value):
        if value < 0 or value > 10:
            raise serializers.ValidationError('Introduction marks must be between 0 and 10')
        return value
    
    def validate_content_marks(self, value):
        if value < 0 or value > 20:
            raise serializers.ValidationError('Content marks must be between 0 and 20')
        return value
    
    def validate_conclusion_marks(self, value):
        if value < 0 or value > 10:
            raise serializers.ValidationError('Conclusion marks must be between 0 and 10')
        return value
    
    def validate_handwriting_marks(self, value):
        if value < 0 or value > 10:
            raise serializers.ValidationError('Handwriting marks must be between 0 and 10')
        return value
    
    def validate_grammar_marks(self, value):
        if value < 0 or value > 10:
            raise serializers.ValidationError('Grammar marks must be between 0 and 10')
        return value
    
    def validate_special_points(self, value):
        if value < 0 or value > 10:
            raise serializers.ValidationError('Special points must be between 0 and 10')
        return value


class EvaluationUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating evaluations
    """
    class Meta:
        model = Evaluation
        fields = [
            'introduction_marks', 'content_marks', 'conclusion_marks',
            'handwriting_marks', 'grammar_marks', 'special_points', 'comments'
        ]
    
    def validate(self, attrs):
        # Check if evaluation is already submitted
        if self.instance and self.instance.is_submitted:
            raise serializers.ValidationError('Cannot update submitted evaluation')
        return attrs


class EvaluationSubmitSerializer(serializers.Serializer):
    """
    Serializer for submitting evaluations
    """
    participant_id = serializers.IntegerField()
    introduction_marks = serializers.IntegerField(min_value=0, max_value=10, required=False, default=0)
    content_marks = serializers.IntegerField(min_value=0, max_value=20, required=False, default=0)
    conclusion_marks = serializers.IntegerField(min_value=0, max_value=10, required=False, default=0)
    handwriting_marks = serializers.IntegerField(min_value=0, max_value=10, required=False, default=0)
    grammar_marks = serializers.IntegerField(min_value=0, max_value=10, required=False, default=0)
    special_points = serializers.IntegerField(min_value=0, max_value=10, required=False, default=0)
    comments = serializers.CharField(max_length=1000, required=False, allow_blank=True, default='')
