from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Q, Avg, Count
from django.utils import timezone
from .models import Evaluation
from .serializers import (
    EvaluationSerializer, EvaluationCreateSerializer, 
    EvaluationUpdateSerializer, EvaluationSubmitSerializer
)
from participants.models import Participant
from participants.serializers import ParticipantSerializer


class EvaluationListCreateView(generics.ListCreateAPIView):
    """
    List and create evaluations
    """
    serializer_class = EvaluationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Only evaluators and admins can see evaluations
        if self.request.user.role not in ['evaluator', 'admin']:
            return Evaluation.objects.none()
        
        # Filter by evaluator unless admin
        queryset = Evaluation.objects.all()
        if self.request.user.role == 'evaluator':
            queryset = queryset.filter(evaluator=self.request.user)
        
        return queryset.order_by('-created_at')
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return EvaluationCreateSerializer
        return EvaluationSerializer
    
    def perform_create(self, serializer):
        # Only evaluators and admins can create evaluations
        if self.request.user.role not in ['evaluator', 'admin']:
            raise permissions.PermissionDenied('Evaluator access required')
        
        # Check if evaluation already exists for this participant and evaluator
        participant = serializer.validated_data['participant']
        if Evaluation.objects.filter(
            participant=participant, 
            evaluator=self.request.user
        ).exists():
            raise serializers.ValidationError(
                'Evaluation already exists for this participant'
            )
        
        serializer.save(evaluator=self.request.user)


class EvaluationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete an evaluation
    """
    serializer_class = EvaluationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Only evaluators and admins can see evaluations
        if self.request.user.role not in ['evaluator', 'admin']:
            return Evaluation.objects.none()
        
        # Filter by evaluator unless admin
        queryset = Evaluation.objects.all()
        if self.request.user.role == 'evaluator':
            queryset = queryset.filter(evaluator=self.request.user)
        
        return queryset
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return EvaluationUpdateSerializer
        return EvaluationSerializer
    
    def perform_update(self, serializer):
        # Check if evaluation is already submitted
        if self.instance.is_submitted:
            raise serializers.ValidationError('Cannot update submitted evaluation')
        
        # Only the evaluator who created it can update (or admin)
        if (self.request.user.role == 'evaluator' and 
            self.instance.evaluator != self.request.user):
            raise permissions.PermissionDenied('Can only update your own evaluations')
        
        serializer.save()
    
    def perform_destroy(self, instance):
        # Only the evaluator who created it can delete (or admin)
        if (self.request.user.role == 'evaluator' and 
            instance.evaluator != self.request.user):
            raise permissions.PermissionDenied('Can only delete your own evaluations')
        instance.delete()


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_evaluation_form(request, registration_number):
    """
    Get evaluation form for a participant by registration number
    """
    if request.user.role not in ['evaluator', 'admin']:
        return Response(
            {'error': 'Evaluator access required'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        participant = Participant.objects.get(registration_number=registration_number)
    except Participant.DoesNotExist:
        return Response(
            {'error': 'Participant not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Get existing evaluation if any
    existing_evaluation = Evaluation.objects.filter(
        participant=participant,
        evaluator=request.user
    ).first()
    
    # Get competition settings for max marks
    from participants.models import CompetitionSettings
    settings = CompetitionSettings.objects.all()
    max_marks = {}
    for setting in settings:
        try:
            max_marks[setting.setting_key] = int(setting.setting_value)
        except (ValueError, TypeError):
            pass
    
    return Response({
        'participant': ParticipantSerializer(participant).data,
        'evaluation': EvaluationSerializer(existing_evaluation).data if existing_evaluation else None,
        'max_marks': max_marks
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def submit_evaluation(request):
    """
    Submit evaluation for a participant
    """
    if request.user.role not in ['evaluator', 'admin']:
        return Response(
            {'error': 'Evaluator access required'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    serializer = EvaluationSubmitSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    participant_id = serializer.validated_data['participant_id']
    
    try:
        participant = Participant.objects.get(id=participant_id)
    except Participant.DoesNotExist:
        return Response(
            {'error': 'Participant not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Check if evaluation already exists
    existing_evaluation = Evaluation.objects.filter(
        participant=participant,
        evaluator=request.user
    ).first()
    
    if existing_evaluation and existing_evaluation.is_submitted:
        return Response(
            {'error': 'Evaluation already submitted for this participant'}, 
            status=status.HTTP_409_CONFLICT
        )
    
    # Create or update evaluation
    evaluation_data = {
        'participant': participant,
        'evaluator': request.user,
        'introduction_marks': serializer.validated_data.get('introduction_marks', 0),
        'content_marks': serializer.validated_data.get('content_marks', 0),
        'conclusion_marks': serializer.validated_data.get('conclusion_marks', 0),
        'handwriting_marks': serializer.validated_data.get('handwriting_marks', 0),
        'grammar_marks': serializer.validated_data.get('grammar_marks', 0),
        'special_points': serializer.validated_data.get('special_points', 0),
        'comments': serializer.validated_data.get('comments', ''),
        'is_submitted': True,
        'submitted_at': timezone.now()
    }
    
    if existing_evaluation:
        # Update existing evaluation
        for key, value in evaluation_data.items():
            if key not in ['participant', 'evaluator']:
                setattr(existing_evaluation, key, value)
        existing_evaluation.save()
        evaluation = existing_evaluation
    else:
        # Create new evaluation
        evaluation = Evaluation.objects.create(**evaluation_data)
    
    return Response({
        'message': 'Evaluation submitted successfully',
        'participant': {
            'registration_number': participant.registration_number,
            'full_name': participant.full_name
        }
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def confirm_evaluation(request, evaluation_id):
    """
    Confirm/submit an evaluation
    """
    if request.user.role not in ['evaluator', 'admin']:
        return Response(
            {'error': 'Evaluator access required'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        evaluation = Evaluation.objects.get(id=evaluation_id)
    except Evaluation.DoesNotExist:
        return Response(
            {'error': 'Evaluation not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Check if user can modify this evaluation
    if (request.user.role == 'evaluator' and 
        evaluation.evaluator != request.user):
        return Response(
            {'error': 'Can only confirm your own evaluations'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    if evaluation.is_submitted:
        return Response(
            {'error': 'Evaluation already submitted'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    evaluation.is_submitted = True
    evaluation.submitted_at = timezone.now()
    evaluation.save()
    
    return Response({
        'evaluation': EvaluationSerializer(evaluation).data
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def my_evaluations(request):
    """
    Get current user's evaluations
    """
    if request.user.role not in ['evaluator', 'admin']:
        return Response(
            {'error': 'Evaluator access required'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    status_filter = request.query_params.get('status', 'all')
    page = int(request.query_params.get('page', 1))
    limit = int(request.query_params.get('limit', 50))
    
    queryset = Evaluation.objects.filter(evaluator=request.user)
    
    if status_filter == 'submitted':
        queryset = queryset.filter(is_submitted=True)
    elif status_filter == 'pending':
        queryset = queryset.filter(is_submitted=False)
    
    # Pagination
    start = (page - 1) * limit
    end = start + limit
    evaluations = queryset.order_by('-updated_at')[start:end]
    
    # Get total count
    total = queryset.count()
    
    serializer = EvaluationSerializer(evaluations, many=True)
    
    return Response({
        'evaluations': serializer.data,
        'pagination': {
            'page': page,
            'limit': limit,
            'total': total,
            'pages': (total + limit - 1) // limit
        }
    })