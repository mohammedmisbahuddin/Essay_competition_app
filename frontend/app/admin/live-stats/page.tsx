'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Users, UserCheck, UserX, TrendingUp, Award, Calendar, BarChart3, RefreshCw } from 'lucide-react';
import { adminAPI } from '@/lib/api';
import toast from 'react-hot-toast';

interface GenderDistribution {
  gender: string;
  count: number;
}

interface AttendanceByGender {
  gender: string;
  total: number;
  present: number;
  absent: number;
  attendance_rate: number;
}

interface AgeCategory {
  age_range: string;
  total_participants: number;
  present_participants: number;
  absent_participants: number;
  attendance_rate: number;
  gender_distribution: GenderDistribution[];
  attendance_by_gender: AttendanceByGender[];
}

interface TopPerformer {
  registration_number: string;
  full_name: string;
  gender: string;
  average_score: number;
  evaluation_count: number;
}

interface LiveStatsData {
  stats: {
    total_participants: number;
    gender_distribution: GenderDistribution[];
    attendance_by_gender: AttendanceByGender[];
    age_categories: {
      gen_1: AgeCategory;
      gen_2: AgeCategory;
    };
    spot_registrations: number;
    present_participants: number;
    absent_participants: number;
    attendance_percentage: number;
    evaluations_completed: number;
    total_evaluations: number;
  };
  top_performers: TopPerformer[];
}

export default function LiveStats() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [statsData, setStatsData] = useState<LiveStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/login');
    } else if (user && user.role === 'admin') {
      fetchLiveStats();
    }
  }, [user, router]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    const interval = setInterval(() => {
      fetchLiveStats(true); // Pass true to indicate auto-refresh
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [user]);

  const fetchLiveStats = async (isAutoRefresh: boolean = false) => {
    try {
      if (isAutoRefresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const response = await adminAPI.getStats();
      console.log('Live Stats response:', response.data);
      setStatsData(response.data);
      
      if (isAutoRefresh) {
        console.log('🔄 Auto-refresh completed');
      }
    } catch (error: any) {
      if (!isAutoRefresh) {
        toast.error('Failed to load live statistics');
      } else {
        console.error('Auto-refresh failed:', error);
      }
      console.error('Error fetching live stats:', error);
    } finally {
      if (isAutoRefresh) {
        setIsRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleManualRefresh = () => {
    fetchLiveStats(false);
    toast.success('Refreshing live statistics...');
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

  if (!statsData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Data Available</h2>
          <p className="text-gray-600">Unable to load live statistics</p>
        </div>
      </div>
    );
  }

  const { stats, top_performers } = statsData;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            {/* Left Section - Back Button and Title */}
            <div className="flex items-center flex-1">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Live Statistics</h1>
                <p className="text-gray-600">Real-time competition analytics and insights</p>
              </div>
            </div>
            
            {/* Center Section - Logo */}
            <div className="flex justify-center flex-1">
              <img 
                src="/BCA.png" 
                alt="Competition Logo" 
                className="h-16 w-auto object-contain"
              />
            </div>
            
            {/* Right Section - Refresh and Back to Dashboard Buttons */}
            <div className="flex justify-end items-center space-x-3 flex-1">
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing || loading}
                className={`flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  isRefreshing || loading
                    ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                    : 'text-gray-700 bg-white hover:bg-gray-50'
                }`}
                title="Refresh Statistics"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                  <UserCheck className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Present</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.present_participants}</dd>
                    <dd className="text-sm text-gray-500">{stats.attendance_percentage.toFixed(1)}%</dd>
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
                    <dt className="text-sm font-medium text-gray-500 truncate">Absent</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.absent_participants}</dd>
                    <dd className="text-sm text-gray-500">
                      {((stats.absent_participants / stats.total_participants) * 100).toFixed(1)}%
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
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Evaluations</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.evaluations_completed}/{stats.total_evaluations}</dd>
                    <dd className="text-sm text-gray-500">
                      {stats.total_evaluations > 0 ? ((stats.evaluations_completed / stats.total_evaluations) * 100).toFixed(1) : 0}%
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts and Visualizations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Gender Distribution */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
              Gender Distribution
            </h3>
            <div className="space-y-4">
              {stats.gender_distribution.map((item) => (
                <div key={item.gender} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-4 h-4 rounded-full mr-3 ${
                      item.gender === 'male' ? 'bg-blue-500' : 
                      item.gender === 'female' ? 'bg-pink-500' : 'bg-gray-500'
                    }`}></div>
                    <span className="text-sm font-medium text-gray-700 capitalize">{item.gender}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">{item.count}</div>
                    <div className="text-xs text-gray-500">
                      {((item.count / stats.total_participants) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Attendance by Gender */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <UserCheck className="w-5 h-5 mr-2 text-green-600" />
              Attendance by Gender
            </h3>
            <div className="space-y-4">
              {stats.attendance_by_gender.map((item) => (
                <div key={item.gender} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 capitalize">{item.gender}</span>
                    <span className="text-sm text-gray-500">{item.attendance_rate.toFixed(1)}%</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <div className="font-medium text-gray-900">{item.total}</div>
                      <div className="text-gray-500">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-green-600">{item.present}</div>
                      <div className="text-gray-500">Present</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-red-600">{item.absent}</div>
                      <div className="text-gray-500">Absent</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Age Categories */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-purple-600" />
            Age Categories Analysis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(stats.age_categories).map(([key, category]) => (
              <div key={key} className="border rounded-lg p-4">
                <h4 className="text-md font-medium text-gray-900 mb-3">{category.age_range}</h4>
                
                {/* Category Overview */}
                <div className="grid grid-cols-3 gap-2 mb-4 text-sm">
                  <div className="text-center">
                    <div className="font-medium text-gray-900">{category.total_participants}</div>
                    <div className="text-gray-500">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-green-600">{category.present_participants}</div>
                    <div className="text-gray-500">Present</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-red-600">{category.absent_participants}</div>
                    <div className="text-gray-500">Absent</div>
                  </div>
                </div>

                {/* Gender Distribution */}
                <div className="mb-3">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Gender Distribution</h5>
                  <div className="space-y-1">
                    {category.gender_distribution.map((gender) => (
                      <div key={gender.gender} className="flex justify-between text-xs">
                        <span className="capitalize">{gender.gender}</span>
                        <span>{gender.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Attendance Rate */}
                <div className="text-center">
                  <div className="text-lg font-medium text-gray-900">{category.attendance_rate.toFixed(1)}%</div>
                  <div className="text-xs text-gray-500">Attendance Rate</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performers */}
        {top_performers && top_performers.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
              <Award className="w-5 h-5 mr-2 text-yellow-600" />
              Top Performers
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Participant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Registration #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gender
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Average Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Evaluations
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {top_performers.map((performer, index) => (
                    <tr key={performer.registration_number} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex items-center">
                          {index === 0 && <Award className="w-4 h-4 text-yellow-500 mr-1" />}
                          {index + 1}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {performer.full_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {performer.registration_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          performer.gender === 'male'
                            ? 'bg-blue-100 text-blue-800'
                            : performer.gender === 'female'
                            ? 'bg-pink-100 text-pink-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {performer.gender}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <div className="text-lg font-medium">{performer.average_score}</div>
                          <div className="ml-2 text-xs text-gray-500">/100</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {performer.evaluation_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
