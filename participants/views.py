from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.db.models import Q
from django.core.paginator import Paginator
from django.utils import timezone
from .models import Participant, CompetitionSettings, GoogleSheetsConfig
from .serializers import (
    ParticipantSerializer, ParticipantCreateSerializer, 
    ParticipantSearchSerializer, CompetitionSettingsSerializer,
    GoogleSheetsConfigSerializer
)
from .utils import generate_registration_number, clean_participant_data
import csv
import io


class ParticipantListCreateView(generics.ListCreateAPIView):
    """
    List and create participants
    """
    queryset = Participant.objects.all()
    serializer_class = ParticipantSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ParticipantCreateSerializer
        return ParticipantSerializer
    
    def get_queryset(self):
        queryset = Participant.objects.all()
        
        # Search functionality
        search = self.request.query_params.get('search', '')
        gender = self.request.query_params.get('gender', '')
        
        if search:
            queryset = queryset.filter(
                Q(full_name__icontains=search) |
                Q(registration_number__icontains=search) |
                Q(email__icontains=search) |
                Q(phone__icontains=search)
            )
        
        if gender:
            queryset = queryset.filter(gender=gender)
        
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        # Check if user has permission to create participants
        if self.request.user.role not in ['registration_desk', 'admin']:
            raise PermissionDenied('Registration desk access required')
        
        # Generate registration number
        registration_number = generate_registration_number()
        serializer.save(
            registration_number=registration_number,
            is_spot_registration=True
        )


class ParticipantDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete a participant
    """
    queryset = Participant.objects.all()
    serializer_class = ParticipantSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return ParticipantCreateSerializer
        return ParticipantSerializer
    
    def perform_update(self, serializer):
        # Check if user has permission to update participants
        if self.request.user.role not in ['registration_desk', 'admin']:
            raise PermissionDenied('Registration desk access required')
        serializer.save()
    
    def perform_destroy(self, instance):
        # Only admin can delete participants
        if self.request.user.role != 'admin':
            raise PermissionDenied('Admin access required')
        instance.delete()


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def search_participants(request):
    """
    Search participants by various criteria
    """
    search_term = request.query_params.get('q', '').strip()
    
    if not search_term:
        return Response({'participants': []})
    
    participants = Participant.objects.filter(
        Q(full_name__icontains=search_term) |
        Q(registration_number__icontains=search_term) |
        Q(email__icontains=search_term) |
        Q(phone__icontains=search_term)
    ).order_by('full_name')[:20]
    
    serializer = ParticipantSerializer(participants, many=True)
    return Response({'participants': serializer.data})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def validate_registration_number(request, registration_number):
    """
    Validate registration number
    """
    try:
        participant = Participant.objects.get(registration_number=registration_number)
        serializer = ParticipantSerializer(participant)
        return Response({
            'valid': True,
            'participant': serializer.data
        })
    except Participant.DoesNotExist:
        return Response({
            'valid': False,
            'message': 'Registration number not found'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def mark_present(request, participant_id):
    """
    Mark participant as present
    """
    if request.user.role not in ['registration_desk', 'admin']:
        return Response(
            {'error': 'Registration desk access required'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        participant = Participant.objects.get(id=participant_id)
        participant.attendance_marked = True
        participant.attendance_marked_at = timezone.now()
        participant.save()
        
        return Response({
            'message': 'Participant marked as present',
            'participant': {
                'id': participant.id,
                'full_name': participant.full_name
            }
        })
    except Participant.DoesNotExist:
        return Response(
            {'error': 'Participant not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def import_csv(request):
    """
    Import participants from CSV file
    """
    if request.user.role != 'admin':
        return Response(
            {'error': 'Admin access required'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    if 'csv_file' not in request.FILES:
        return Response(
            {'error': 'No CSV file uploaded'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    csv_file = request.FILES['csv_file']
    
    if not csv_file.name.endswith('.csv'):
        return Response(
            {'error': 'Only CSV files are allowed'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Read CSV file
        file_data = csv_file.read().decode('utf-8')
        csv_data = csv.DictReader(io.StringIO(file_data))
        participants_data = list(csv_data)
        
        if not participants_data:
            return Response(
                {'error': 'No data found in CSV file'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Clean and validate data
        cleaned_data = clean_participant_data(participants_data)
        
        if not cleaned_data:
            return Response(
                {'error': 'No valid participant data found after cleaning'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Process participants
        results = {
            'total': len(cleaned_data),
            'created': 0,
            'updated': 0,
            'skipped': 0,
            'errors': []
        }
        
        for participant_data in cleaned_data:
            try:
                # Check if participant already exists
                existing_participant = None
                
                if participant_data.get('email'):
                    existing_participant = Participant.objects.filter(
                        email=participant_data['email']
                    ).first()
                
                if not existing_participant and participant_data.get('phone'):
                    existing_participant = Participant.objects.filter(
                        phone=participant_data['phone']
                    ).first()
                
                if existing_participant:
                    # Update existing participant
                    for key, value in participant_data.items():
                        if hasattr(existing_participant, key):
                            setattr(existing_participant, key, value)
                    existing_participant.save()
                    results['updated'] += 1
                else:
                    # Create new participant
                    registration_number = generate_registration_number()
                    Participant.objects.create(
                        registration_number=registration_number,
                        is_spot_registration=False,
                        **participant_data
                    )
                    results['created'] += 1
                    
            except Exception as e:
                results['errors'].append({
                    'participant': participant_data.get('full_name', 'Unknown'),
                    'error': str(e)
                })
                results['skipped'] += 1
        
        return Response({
            'message': 'CSV import completed successfully',
            'results': results
        })
        
    except Exception as e:
        return Response(
            {'error': f'Failed to process CSV file: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def export_results(request):
    """
    Export results to CSV
    """
    if request.user.role != 'admin':
        return Response(
            {'error': 'Admin access required'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    # This would need to be implemented with evaluation data
    # For now, return a placeholder response
    return Response({
        'message': 'Export functionality will be implemented with evaluation system'
    })