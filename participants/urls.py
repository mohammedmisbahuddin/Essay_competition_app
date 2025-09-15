from django.urls import path
from . import views

urlpatterns = [
    path('', views.ParticipantListCreateView.as_view(), name='participant_list_create'),
    path('<int:id>/', views.ParticipantDetailView.as_view(), name='participant_detail'),
    path('search/', views.search_participants, name='search_participants'),
    path('validate/<str:registration_number>/', views.validate_registration_number, name='validate_registration'),
    path('<int:participant_id>/present/', views.mark_present, name='mark_present'),
    path('export/results/', views.export_results, name='export_results'),
]
