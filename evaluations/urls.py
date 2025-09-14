from django.urls import path
from . import views

urlpatterns = [
    path('', views.EvaluationListCreateView.as_view(), name='evaluation_list_create'),
    path('<int:id>/', views.EvaluationDetailView.as_view(), name='evaluation_detail'),
    path('participant/<str:registration_number>/', views.get_evaluation_form, name='get_evaluation_form'),
    path('submit/', views.submit_evaluation, name='submit_evaluation'),
    path('<int:evaluation_id>/confirm/', views.confirm_evaluation, name='confirm_evaluation'),
    path('my-evaluations/', views.my_evaluations, name='my_evaluations'),
]
