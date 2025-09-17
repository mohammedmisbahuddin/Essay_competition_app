from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Q, Avg, Count, Sum
from django.http import HttpResponse
from django.utils import timezone
from authentication.models import User
from participants.models import Participant, CompetitionSettings, GoogleSheetsConfig
from participants.utils import clean_participant_data, generate_registration_number
from evaluations.models import Evaluation
from participants.serializers import ParticipantSerializer
from authentication.serializers import UserSerializer
import csv
import io


def require_admin(view_func):
    """
    Decorator to require admin access
    """
    def wrapper(request, *args, **kwargs):
        if request.user.role != 'admin':
            return Response(
                {'error': 'Admin access required'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        return view_func(request, *args, **kwargs)
    return wrapper


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
@require_admin
def dashboard_stats(request):
    """
    Get dashboard statistics
    """
    stats = {}
    
    # Total participants
    stats['total_participants'] = Participant.objects.count()
    
    # Participants by gender
    gender_stats = Participant.objects.values('gender').annotate(
        count=Count('id')
    ).order_by('gender')
    stats['gender_distribution'] = list(gender_stats)
    
    # Spot registrations
    stats['spot_registrations'] = Participant.objects.filter(
        is_spot_registration=True
    ).count()
    
    # Attendance statistics
    stats['present_participants'] = Participant.objects.filter(
        attendance_marked=True
    ).count()
    stats['absent_participants'] = Participant.objects.filter(
        attendance_marked=False
    ).count()
    stats['attendance_percentage'] = round(
        (stats['present_participants'] / stats['total_participants'] * 100) if stats['total_participants'] > 0 else 0, 2
    )
    
    # Evaluations completed
    stats['evaluations_completed'] = Evaluation.objects.filter(
        is_submitted=True
    ).count()
    
    # Total evaluations
    stats['total_evaluations'] = Evaluation.objects.count()
    
    # Top performers - get participants with submitted evaluations
    top_performers = []
    
    # Get all submitted evaluations
    submitted_evaluations = Evaluation.objects.filter(is_submitted=True)
    
    # Group evaluations by participant registration number
    participant_scores = {}
    for evaluation in submitted_evaluations:
        reg_num = evaluation.participant_registration_number
        if reg_num not in participant_scores:
            participant_scores[reg_num] = []
        
        total_score = (
            evaluation.introduction_marks + evaluation.content_marks + 
            evaluation.conclusion_marks + evaluation.handwriting_marks + 
            evaluation.grammar_marks + evaluation.special_points
        )
        participant_scores[reg_num].append(total_score)
    
    # Calculate average scores for each participant
    for reg_num, scores in participant_scores.items():
        try:
            participant = Participant.objects.get(registration_number=reg_num)
            average_score = sum(scores) / len(scores)
            top_performers.append({
                'participant': participant,
                'average_score': average_score,
                'evaluation_count': len(scores)
            })
        except Participant.DoesNotExist:
            # Skip if participant doesn't exist
            continue
    
    # Sort by average score and take top 10
    top_performers = sorted(top_performers, key=lambda x: x['average_score'], reverse=True)[:10]
    
    return Response({
        'stats': stats,
        'top_performers': [
            {
                'registration_number': p['participant'].registration_number,
                'full_name': p['participant'].full_name,
                'gender': p['participant'].gender,
                'average_score': float(p['average_score']),
                'evaluation_count': p['evaluation_count']
            }
            for p in top_performers
        ]
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
@require_admin
def get_results(request):
    """
    Get all results with pagination and sorting
    """
    page = int(request.query_params.get('page', 1))
    limit = int(request.query_params.get('limit', 50))
    sort_by = request.query_params.get('sortBy', 'average_marks')
    sort_order = request.query_params.get('sortOrder', 'DESC')
    gender = request.query_params.get('gender', '')
    search = request.query_params.get('search', '')
    
    # Get all submitted evaluations
    submitted_evaluations = Evaluation.objects.filter(is_submitted=True)
    
    # Group evaluations by participant registration number
    participant_scores = {}
    for evaluation in submitted_evaluations:
        reg_num = evaluation.participant_registration_number
        if reg_num not in participant_scores:
            participant_scores[reg_num] = []
        
        total_score = (
            evaluation.introduction_marks + evaluation.content_marks + 
            evaluation.conclusion_marks + evaluation.handwriting_marks + 
            evaluation.grammar_marks + evaluation.special_points
        )
        participant_scores[reg_num].append(total_score)
    
    # Calculate marks for each participant
    results = []
    for reg_num, scores in participant_scores.items():
        try:
            participant = Participant.objects.get(registration_number=reg_num)
            average_marks = sum(scores) / len(scores)
            min_marks = min(scores)
            max_marks = max(scores)
            
            results.append({
                'participant': participant,
                'average_marks': average_marks,
                'evaluation_count': len(scores),
                'min_marks': min_marks,
                'max_marks': max_marks
            })
        except Participant.DoesNotExist:
            # Skip if participant doesn't exist
            continue
    
    # Apply filters before sorting
    if gender:
        results = [r for r in results if r['participant'].gender == gender]
    
    if search:
        results = [r for r in results if 
                  search.lower() in r['participant'].full_name.lower() or 
                  search.lower() in r['participant'].registration_number.lower()]
    
    # Sort results
    if sort_by == 'average_marks':
        results.sort(key=lambda x: x['average_marks'], reverse=(sort_order == 'DESC'))
    elif sort_by == 'evaluation_count':
        results.sort(key=lambda x: x['evaluation_count'], reverse=(sort_order == 'DESC'))
    else:
        results.sort(key=lambda x: x['participant'].full_name)
    
    # Apply pagination
    start = (page - 1) * limit
    end = start + limit
    paginated_results = results[start:end]
    
    # Get total count for pagination info
    total = len(results)
    
    return Response({
        'results': [
            {
                'id': r['participant'].id,
                'registration_number': r['participant'].registration_number,
                'full_name': r['participant'].full_name,
                'gender': r['participant'].gender,
                'qualification': r['participant'].qualification,
                'average_marks': float(r['average_marks']),
                'evaluation_count': r['evaluation_count'],
                'min_marks': float(r['min_marks']),
                'max_marks': float(r['max_marks'])
            }
            for r in paginated_results
        ],
        'pagination': {
            'page': page,
            'limit': limit,
            'total': total,
            'pages': (total + limit - 1) // limit
        }
    })


@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
@require_admin
def get_users(request):
    """
    Get all users or create new user
    """
    if request.method == 'GET':
        users = User.objects.all().order_by('-date_joined')
        serializer = UserSerializer(users, many=True)
        return Response({'users': serializer.data})
    
    elif request.method == 'POST':
        # Create new user
        username = request.data.get('username')
        password = request.data.get('password')
        role = request.data.get('role')
        email = request.data.get('email')
        full_name = request.data.get('full_name')
        
        # Validate required fields
        if not all([username, password, role]):
            return Response(
                {'error': 'Username, password, and role are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate role
        valid_roles = ['admin', 'registration_desk', 'invigilator', 'evaluator']
        if role not in valid_roles:
            return Response(
                {'error': 'Invalid role. Must be one of: admin, registration_desk, invigilator, evaluator'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if username already exists
        if User.objects.filter(username=username).exists():
            return Response(
                {'error': 'Username already exists'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if email already exists (if provided)
        if email and User.objects.filter(email=email).exists():
            return Response(
                {'error': 'Email already exists'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Create user
            user = User.objects.create_user(
                username=username,
                password=password,
                role=role,
                email=email or '',
                full_name=full_name or username,
                is_active=True
            )
            
            # Set admin permissions if role is admin
            if role == 'admin':
                user.is_staff = True
                user.is_superuser = True
                user.save()
            
            return Response({
                'message': 'User created successfully',
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to create user: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
@require_admin
def create_user(request):
    """
    Create new user
    """
    username = request.data.get('username')
    password = request.data.get('password')
    role = request.data.get('role')
    email = request.data.get('email')
    full_name = request.data.get('full_name')
    
    # Validate required fields
    if not all([username, password, role]):
        return Response(
            {'error': 'Username, password, and role are required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Validate role
    valid_roles = ['admin', 'registration_desk', 'invigilator', 'evaluator']
    if role not in valid_roles:
        return Response(
            {'error': 'Invalid role. Must be one of: admin, registration_desk, invigilator, evaluator'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check if username already exists
    if User.objects.filter(username=username).exists():
        return Response(
            {'error': 'Username already exists'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Create user
    user = User.objects.create_user(
        username=username,
        password=password,
        role=role,
        email=email or f"{username}@example.com",
        full_name=full_name or username
    )
    
    return Response({
        'message': 'User created successfully',
        'user': UserSerializer(user).data
    }, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT'])
@permission_classes([permissions.IsAuthenticated])
@require_admin
def get_settings(request):
    """
    Get or update competition settings
    """
    if request.method == 'GET':
        settings = CompetitionSettings.objects.all().order_by('setting_key')
        settings_obj = {}
        for setting in settings:
            settings_obj[setting.setting_key] = {
                'value': setting.setting_value,
                'description': setting.description
            }
        
        return Response({'settings': settings_obj})
    
    elif request.method == 'PUT':
        # Update settings
        settings_data = request.data.get('settings', {})
        updated_settings = {}
        
        for key, value in settings_data.items():
            try:
                setting, created = CompetitionSettings.objects.get_or_create(
                    setting_key=key,
                    defaults={'setting_value': str(value), 'description': f'Setting for {key}'}
                )
                
                if not created:
                    setting.setting_value = str(value)
                    setting.save()
                
                updated_settings[key] = setting.setting_value
                
            except Exception as e:
                return Response(
                    {'error': f'Failed to update setting {key}: {str(e)}'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return Response({
            'message': 'Settings updated successfully',
            'updated_settings': updated_settings
        })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
@require_admin
def export_results_csv(request):
    """
    Export results to CSV
    """
    # Get participants with submitted evaluations
    participants_with_evaluations = Participant.objects.filter(
        evaluations__is_submitted=True
    ).distinct()
    
    # Calculate marks for each participant
    results = []
    for participant in participants_with_evaluations:
        evaluations = participant.evaluations.filter(is_submitted=True)
        if evaluations.exists():
            total_marks = sum(
                eval.introduction_marks + eval.content_marks + eval.conclusion_marks +
                eval.handwriting_marks + eval.grammar_marks + eval.special_points
                for eval in evaluations
            )
            average_marks = total_marks / evaluations.count()
            results.append({
                'participant': participant,
                'average_marks': average_marks,
                'evaluation_count': evaluations.count()
            })
    
    # Sort by average marks
    results.sort(key=lambda x: x['average_marks'], reverse=True)
    
    # Create CSV response
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="essay_competition_results.csv"'
    
    writer = csv.writer(response)
    writer.writerow([
        'Registration Number', 'Full Name', 'Gender', 'Email', 'Phone', 
        'Qualification', 'Average Marks', 'Evaluation Count'
    ])
    
    for result in results:
        participant = result['participant']
        writer.writerow([
            participant.registration_number,
            participant.full_name,
            participant.gender or '',
            participant.email or '',
            participant.phone or '',
            participant.qualification or '',
            float(result['average_marks']),
            result['evaluation_count']
        ])
    
    return response


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
@require_admin
def clear_all_data(request):
    """
    Clear all data (CRITICAL OPERATION)
    """
    confirm_code = request.data.get('confirmCode')
    
    if confirm_code != 'CLEAR_ALL_DATA_CONFIRM':
        return Response({
            'error': 'Invalid confirmation code. This operation requires explicit confirmation.',
            'message': 'To clear all data, you must provide the exact confirmation code: CLEAR_ALL_DATA_CONFIRM'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Clear all tables in correct order
    Evaluation.objects.all().delete()
    Participant.objects.all().delete()
    
    # Only clear non-admin users
    User.objects.exclude(role='admin').delete()
    
    return Response({
        'message': 'All data has been cleared successfully',
        'warning': 'This operation cannot be undone',
        'cleared_tables': ['participants', 'evaluations', 'non-admin users'],
        'preserved': ['admin users', 'competition settings']
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
@require_admin
def import_csv(request):
    """
    Import participants from CSV file
    """
    # Check for both possible field names (csv_file or csvFile)
    csv_file = None
    if 'csv_file' in request.FILES:
        csv_file = request.FILES['csv_file']
    elif 'csvFile' in request.FILES:
        csv_file = request.FILES['csvFile']
    else:
        return Response(
            {'error': 'No CSV file uploaded. Expected field name: csv_file or csvFile'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
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