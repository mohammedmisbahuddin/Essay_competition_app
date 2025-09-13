import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { LogOut, User, Shield, BookOpen, Users, Award } from 'lucide-react';

export default function DashboardPage() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Essay Competition Management</h1>
                <p className="text-sm text-gray-600">PCWT-Education Department</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-700">{user?.full_name || user?.username}</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {user?.role?.replace('_', ' ')}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Welcome to Your Dashboard</h2>
          <p className="text-lg text-gray-600 mb-8">
            Manage your essay competition efficiently with our comprehensive tools.
          </p>

          {/* Role-based navigation */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {user?.role === 'admin' && (
              <>
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <Users className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Users</h3>
                  <p className="text-gray-600 text-sm">Add and manage system users</p>
                </div>
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <Award className="h-8 w-8 text-green-600 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">View Results</h3>
                  <p className="text-gray-600 text-sm">Check competition results and rankings</p>
                </div>
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <Shield className="h-8 w-8 text-purple-600 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Settings</h3>
                  <p className="text-gray-600 text-sm">Configure competition settings</p>
                </div>
              </>
            )}
            
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <BookOpen className="h-8 w-8 text-orange-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Registration</h3>
              <p className="text-gray-600 text-sm">Manage participant registrations</p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-gray-500">
              © 2024 PCWT-Education Department. All rights reserved.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}