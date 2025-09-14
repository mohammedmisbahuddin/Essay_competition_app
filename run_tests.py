#!/usr/bin/env python
"""
Test runner script for Essay Competition Django Backend
This script runs all tests and provides a comprehensive test report
"""

import os
import sys
import django
from django.conf import settings
from django.test.utils import get_runner

def run_tests():
    """Run all tests and return results"""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'essay_competition_django.settings')
    django.setup()
    
    TestRunner = get_runner(settings)
    test_runner = TestRunner()
    
    # Run tests for all apps
    test_apps = [
        'authentication',
        'participants', 
        'evaluations',
        'admin_panel'
    ]
    
    failures = test_runner.run_tests(test_apps)
    
    return failures

def run_specific_tests(test_pattern=None):
    """Run specific tests based on pattern"""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'essay_competition_django.settings')
    django.setup()
    
    TestRunner = get_runner(settings)
    test_runner = TestRunner()
    
    if test_pattern:
        failures = test_runner.run_tests([test_pattern])
    else:
        failures = test_runner.run_tests()
    
    return failures

def main():
    """Main function to run tests"""
    print("=" * 60)
    print("Essay Competition Django Backend - Test Suite")
    print("=" * 60)
    
    if len(sys.argv) > 1:
        test_pattern = sys.argv[1]
        print(f"Running tests matching pattern: {test_pattern}")
        failures = run_specific_tests(test_pattern)
    else:
        print("Running all tests...")
        failures = run_tests()
    
    print("\n" + "=" * 60)
    if failures:
        print(f"❌ Tests failed: {failures} test(s) failed")
        sys.exit(1)
    else:
        print("✅ All tests passed!")
        sys.exit(0)

if __name__ == '__main__':
    main()
