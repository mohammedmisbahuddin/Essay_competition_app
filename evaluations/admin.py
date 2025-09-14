from django.contrib import admin
from .models import Evaluation


@admin.register(Evaluation)
class EvaluationAdmin(admin.ModelAdmin):
    list_display = ('participant', 'evaluator', 'introduction_marks', 'content_marks', 'conclusion_marks', 'handwriting_marks', 'grammar_marks', 'special_points', 'total_marks', 'is_submitted', 'created_at')
    list_filter = ('is_submitted', 'created_at', 'evaluator')
    search_fields = ('participant__full_name', 'participant__registration_number', 'evaluator__username')
    ordering = ('-created_at',)
    readonly_fields = ('total_marks', 'created_at', 'updated_at')
    
    fieldsets = (
        ('Evaluation Details', {
            'fields': ('participant', 'evaluator', 'is_submitted')
        }),
        ('Marks', {
            'fields': ('introduction_marks', 'content_marks', 'conclusion_marks', 'handwriting_marks', 'grammar_marks', 'special_points', 'total_marks')
        }),
        ('Comments', {
            'fields': ('comments',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('participant', 'evaluator')