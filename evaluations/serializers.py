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
    participant_registration_number = serializers.CharField(max_length=20)
    
    class Meta:
        model = Evaluation
        fields = [
            'participant_registration_number', 'introduction_marks', 'content_marks',
            'conclusion_marks', 'handwriting_marks', 'grammar_marks',
            'special_points', 'comments'
        ]
    
    def validate_participant_registration_number(self, value):
        """Validate that the participant exists"""
        from participants.models import Participant
        try:
            Participant.objects.get(registration_number=value)
        except Participant.DoesNotExist:
            raise serializers.ValidationError(f"Participant with registration number '{value}' does not exist")
        return value
    
    def get_max_marks(self):
        """Get maximum marks from competition settings"""
        from participants.models import CompetitionSettings
        settings = CompetitionSettings.objects.all()
        max_marks = {}
        mark_settings = [
            'max_introduction_marks', 'max_content_marks', 'max_conclusion_marks',
            'max_handwriting_marks', 'max_grammar_marks', 'max_special_points'
        ]
        for setting in settings:
            if setting.setting_key in mark_settings:
                try:
                    max_marks[setting.setting_key] = int(setting.setting_value)
                except (ValueError, TypeError):
                    # Use default value if conversion fails
                    max_marks[setting.setting_key] = 10
        return max_marks
    
    def validate_introduction_marks(self, value):
        max_marks = self.get_max_marks()
        max_intro = max_marks.get('max_introduction_marks', 10)
        if value < 0 or value > max_intro:
            raise serializers.ValidationError(f'Introduction marks must be between 0 and {max_intro}')
        return value
    
    def validate_content_marks(self, value):
        max_marks = self.get_max_marks()
        max_content = max_marks.get('max_content_marks', 20)
        if value < 0 or value > max_content:
            raise serializers.ValidationError(f'Content marks must be between 0 and {max_content}')
        return value
    
    def validate_conclusion_marks(self, value):
        max_marks = self.get_max_marks()
        max_conclusion = max_marks.get('max_conclusion_marks', 10)
        if value < 0 or value > max_conclusion:
            raise serializers.ValidationError(f'Conclusion marks must be between 0 and {max_conclusion}')
        return value
    
    def validate_handwriting_marks(self, value):
        max_marks = self.get_max_marks()
        max_handwriting = max_marks.get('max_handwriting_marks', 10)
        if value < 0 or value > max_handwriting:
            raise serializers.ValidationError(f'Handwriting marks must be between 0 and {max_handwriting}')
        return value
    
    def validate_grammar_marks(self, value):
        max_marks = self.get_max_marks()
        max_grammar = max_marks.get('max_grammar_marks', 10)
        if value < 0 or value > max_grammar:
            raise serializers.ValidationError(f'Grammar marks must be between 0 and {max_grammar}')
        return value
    
    def validate_special_points(self, value):
        max_marks = self.get_max_marks()
        max_special = max_marks.get('max_special_points', 10)
        if value < 0 or value > max_special:
            raise serializers.ValidationError(f'Special points must be between 0 and {max_special}')
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
    participant_registration_number = serializers.CharField(max_length=20)
    introduction_marks = serializers.IntegerField(required=False, default=0)
    content_marks = serializers.IntegerField(required=False, default=0)
    conclusion_marks = serializers.IntegerField(required=False, default=0)
    handwriting_marks = serializers.IntegerField(required=False, default=0)
    grammar_marks = serializers.IntegerField(required=False, default=0)
    special_points = serializers.IntegerField(required=False, default=0)
    comments = serializers.CharField(max_length=1000, required=False, allow_blank=True, default='')
    
    def get_max_marks(self):
        """Get maximum marks from competition settings"""
        from participants.models import CompetitionSettings
        settings = CompetitionSettings.objects.all()
        max_marks = {}
        mark_settings = [
            'max_introduction_marks', 'max_content_marks', 'max_conclusion_marks',
            'max_handwriting_marks', 'max_grammar_marks', 'max_special_points'
        ]
        for setting in settings:
            if setting.setting_key in mark_settings:
                try:
                    max_marks[setting.setting_key] = int(setting.setting_value)
                except (ValueError, TypeError):
                    # Use default value if conversion fails
                    max_marks[setting.setting_key] = 10
        return max_marks
    
    def validate_participant_registration_number(self, value):
        """Validate that the participant exists"""
        from participants.models import Participant
        try:
            Participant.objects.get(registration_number=value)
        except Participant.DoesNotExist:
            raise serializers.ValidationError(f"Participant with registration number '{value}' does not exist")
        return value
    
    def validate_introduction_marks(self, value):
        max_marks = self.get_max_marks()
        max_intro = max_marks.get('max_introduction_marks', 10)
        if value < 0 or value > max_intro:
            raise serializers.ValidationError(f'Introduction marks must be between 0 and {max_intro}')
        return value
    
    def validate_content_marks(self, value):
        max_marks = self.get_max_marks()
        max_content = max_marks.get('max_content_marks', 20)
        if value < 0 or value > max_content:
            raise serializers.ValidationError(f'Content marks must be between 0 and {max_content}')
        return value
    
    def validate_conclusion_marks(self, value):
        max_marks = self.get_max_marks()
        max_conclusion = max_marks.get('max_conclusion_marks', 10)
        if value < 0 or value > max_conclusion:
            raise serializers.ValidationError(f'Conclusion marks must be between 0 and {max_conclusion}')
        return value
    
    def validate_handwriting_marks(self, value):
        max_marks = self.get_max_marks()
        max_handwriting = max_marks.get('max_handwriting_marks', 10)
        if value < 0 or value > max_handwriting:
            raise serializers.ValidationError(f'Handwriting marks must be between 0 and {max_handwriting}')
        return value
    
    def validate_grammar_marks(self, value):
        max_marks = self.get_max_marks()
        max_grammar = max_marks.get('max_grammar_marks', 10)
        if value < 0 or value > max_grammar:
            raise serializers.ValidationError(f'Grammar marks must be between 0 and {max_grammar}')
        return value
    
    def validate_special_points(self, value):
        max_marks = self.get_max_marks()
        max_special = max_marks.get('max_special_points', 10)
        if value < 0 or value > max_special:
            raise serializers.ValidationError(f'Special points must be between 0 and {max_special}')
        return value
