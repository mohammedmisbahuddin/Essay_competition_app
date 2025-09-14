from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Q, Avg, Count, Sum
from django.http import HttpResponse
from django.utils import timezone
from authentication.models import User
from participants.models import Participant, CompetitionSettings, GoogleSheetsConfig
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
    
    # Evaluations completed
    stats['evaluations_completed'] = Evaluation.objects.filter(
        is_submitted=True
    ).count()
    
    # Total evaluations
    stats['total_evaluations'] = Evaluation.objects.count()
    
    # Top performers - get participants with submitted evaluations
    top_performers = []
    participants_with_evaluations = Participant.objects.filter(
        evaluations__is_submitted=True
    ).distinct()
    
    for participant in participants_with_evaluations:
        evaluations = participant.evaluations.filter(is_submitted=True)
        if evaluations.exists():
            total_score = sum(
                eval.introduction_marks + eval.content_marks + eval.conclusion_marks +
                eval.handwriting_marks + eval.grammar_marks + eval.special_points
                for eval in evaluations
            )
            average_score = total_score / evaluations.count()
            top_performers.append({
                'participant': participant,
                'average_score': average_score,
                'evaluation_count': evaluations.count()
            })
    
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
    
    # Build queryset - get participants with submitted evaluations
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
                'evaluation_count': evaluations.count(),
                'min_marks': total_marks,
                'max_marks': total_marks
            })
    
    # Sort results
    if sortBy == 'average_marks':
        results.sort(key=lambda x: x['average_marks'], reverse=(sort_order == 'DESC'))
    elif sortBy == 'evaluation_count':
        results.sort(key=lambda x: x['evaluation_count'], reverse=(sort_order == 'DESC'))
    else:
        results.sort(key=lambda x: x['participant'].full_name)
    
    # Apply pagination
    start = (page - 1) * page_size
    end = start + page_size
    paginated_results = results[start:end]
    
    # Apply filters
    if gender:
        results = [r for r in results if r['participant'].gender == gender]
    
    if search:
        results = [r for r in results if 
                  search.lower() in r['participant'].full_name.lower() or 
                  search.lower() in r['participant'].registration_number.lower()]
    
    # Apply sorting (already done above)
    # Results are already sorted and paginated
    
    # Get total count for pagination info
    total = len(results)
    results = paginated_results
    
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
            for r in results
        ],
        'pagination': {
            'page': page,
            'limit': page_size,
            'total': total,
            'pages': (total + page_size - 1) // page_size
        }
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
@require_admin
def get_users(request):
    """
    Get all users
    """
    users = User.objects.all().order_by('-date_joined')
    serializer = UserSerializer(users, many=True)
    return Response({'users': serializer.data})


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


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
@require_admin
def get_settings(request):
    """
    Get competition settings
    """
    settings = CompetitionSettings.objects.all().order_by('setting_key')
    settings_obj = {}
    for setting in settings:
        settings_obj[setting.setting_key] = {
            'value': setting.setting_value,
            'description': setting.description
        }
    
    return Response({'settings': settings_obj})


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