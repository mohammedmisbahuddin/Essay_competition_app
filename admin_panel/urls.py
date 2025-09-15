from django.urls import path
from . import views

urlpatterns = [
    path('dashboard/', views.dashboard_stats, name='dashboard_stats'),
    path('stats/', views.dashboard_stats, name='stats'),
    path('results/', views.get_results, name='get_results'),
    path('users/', views.get_users, name='get_users'),
    path('users/create/', views.create_user, name='create_user'),
    path('settings/', views.get_settings, name='get_settings'),
    path('export/results/', views.export_results_csv, name='export_results_csv'),
    path('import/csv/', views.import_csv, name='import_csv'),
    path('clear-all-data/', views.clear_all_data, name='clear_all_data'),
]
