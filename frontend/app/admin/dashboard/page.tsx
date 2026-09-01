'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LogOut, Users, FileText, BarChart3, Settings, UserCheck, UserX, TrendingUp } from 'lucide-react';
import { adminAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    total_participants: 0,
    evaluations_completed: 0,
    total_evaluations: 0,
    spot_registrations: 0,
    present_participants: 0,
    absent_participants: 0,
    attendance_percentage: 0,
    gender_distribution: [],
    attendance_by_gender: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('Admin Dashboard - user:', user);
    console.log('Admin Dashboard - user role:', user?.role);
    if (user && user.role !== 'admin') {
      console.log('User role is not admin, redirecting to login');
      router.push('/login');
    } else if (user && user.role === 'admin') {
      console.log('User role is admin, fetching stats');
      fetchStats();
    }
  }, [user, router]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Fetch admin stats
      const statsResponse = await adminAPI.getStats();
      console.log('Full API response:', statsResponse);
      console.log('Stats response data:', statsResponse.data);
      console.log('Stats object:', statsResponse.data?.stats);
      
      // Use the stats directly from the API response with fallback values
      const apiStats = statsResponse.data.stats || {};
      setStats({
        total_participants: apiStats.total_participants || 0,
        evaluations_completed: apiStats.evaluations_completed || 0,
        total_evaluations: apiStats.total_evaluations || 0,
        spot_registrations: apiStats.spot_registrations || 0,
        present_participants: apiStats.present_participants || 0,
        absent_participants: apiStats.absent_participants || 0,
        attendance_percentage: apiStats.attendance_percentage || 0,
        gender_distribution: apiStats.gender_distribution || [],
        attendance_by_gender: apiStats.attendance_by_gender || []
      });
    } catch (error: any) {
      toast.error('Failed to load statistics');
      console.error('Error fetching stats:', error);
      console.error('Error response:', error.response?.data);
      
      // Set default values on error
      setStats({
        total_participants: 0,
        evaluations_completed: 0,
        total_evaluations: 0,
        spot_registrations: 0,
        present_participants: 0,
        absent_participants: 0,
        attendance_percentage: 0,
        gender_distribution: [],
        attendance_by_gender: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleManageUsers = () => {
    router.push('/admin/users');
  };

  const handleViewResults = () => {
    router.push('/admin/results');
  };

  const handleSettings = () => {
    router.push('/admin/settings');
  };

  const handleLiveStats = () => {
    router.push('/admin/live-stats');
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            {/* Left Section - Title */}
            <div className="flex items-center flex-1">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-gray-600">Welcome back, {user.full_name}</p>
              </div>
            </div>
            
            {/* Center Section - Logo */}
            <div className="flex justify-center flex-1">
              <img 
                src="/logo.png" 
                alt="PCWT Logo" 
                className="h-16 w-auto object-contain"
              />
            </div>
            
            {/* Right Section - Logout Button */}
            <div className="flex justify-end flex-1">
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Participants</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.total_participants}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Evaluations Completed</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.evaluations_completed}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Evaluations</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.total_evaluations}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Spot Registrations</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.spot_registrations}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserCheck className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Present Participants</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.present_participants}</dd>
                    <dd className="text-sm text-gray-500">
                      {(stats.attendance_percentage || 0).toFixed(1)}% attendance rate
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserX className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Absent Participants</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.absent_participants}</dd>
                    <dd className="text-sm text-gray-500">
                      {stats.total_participants > 0 
                        ? `${Math.round((stats.absent_participants / stats.total_participants) * 100)}% of total`
                        : '0% of total'
                      }
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button 
                onClick={handleManageUsers}
                className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <Users className="w-5 h-5 mr-2" />
                Manage Participants
              </button>
              <button 
                onClick={handleViewResults}
                className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <FileText className="w-5 h-5 mr-2" />
                View Results
              </button>
              <button 
                onClick={handleLiveStats}
                className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <TrendingUp className="w-5 h-5 mr-2" />
                Live Stats
              </button>
              <button 
                onClick={handleSettings}
                className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <Settings className="w-5 h-5 mr-2" />
                Settings
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
