from django.contrib import admin
from .models import Participant, CompetitionSettings, GoogleSheetsConfig


@admin.register(Participant)
class ParticipantAdmin(admin.ModelAdmin):
    list_display = ('registration_number', 'full_name', 'email', 'phone', 'gender', 'age', 'attendance_marked', 'created_at')
    list_filter = ('gender', 'attendance_marked', 'is_spot_registration', 'created_at')
    search_fields = ('registration_number', 'full_name', 'email', 'phone')
    ordering = ('-created_at',)
    readonly_fields = ('registration_number', 'created_at', 'updated_at')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('registration_number', 'full_name', 'email', 'phone')
        }),
        ('Personal Details', {
            'fields': ('gender', 'age', 'qualification', 'father_name')
        }),
        ('Competition Status', {
            'fields': ('attendance_marked', 'attendance_marked_at', 'is_spot_registration')
        }),
        ('Timestamps', {
            'fields': ('registration_timestamp', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(CompetitionSettings)
class CompetitionSettingsAdmin(admin.ModelAdmin):
    list_display = ('setting_key', 'setting_value', 'created_at')
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Setting Details', {
            'fields': ('setting_key', 'setting_value', 'description')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(GoogleSheetsConfig)
class GoogleSheetsConfigAdmin(admin.ModelAdmin):
    list_display = ('sheet_name', 'is_active', 'created_at')
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Configuration', {
            'fields': ('sheet_id', 'sheet_name', 'is_active')
        }),
        ('Credentials', {
            'fields': ('credentials_json',),
            'classes': ('collapse',)
        }),
        ('Sync Information', {
            'fields': ('last_sync',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )