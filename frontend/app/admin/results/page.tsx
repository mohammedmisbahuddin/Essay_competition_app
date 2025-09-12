'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Trophy, Medal, Award, Download, Search } from 'lucide-react';
import { adminAPI } from '@/lib/api';
import toast from 'react-hot-toast';

interface EvaluationResult {
  id: number;
  registration_number: string;
  full_name: string;
  gender: string;
  institution: string;
  average_marks: number;
  evaluation_count: number;
  min_marks: number;
  max_marks: number;
  all_comments: string;
}

export default function ViewResults() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [results, setResults] = useState<EvaluationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredResults, setFilteredResults] = useState<EvaluationResult[]>([]);
  const [sortBy, setSortBy] = useState<'total_score' | 'participant_name'>('total_score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/login');
    } else if (user && user.role === 'admin') {
      fetchResults();
    }
  }, [user, router]);

  useEffect(() => {
    let filtered = results.filter(result =>
      result.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.registration_number.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort results
    filtered.sort((a, b) => {
      const aValue = sortBy === 'total_score' ? a.average_marks : a.full_name;
      const bValue = sortBy === 'total_score' ? b.average_marks : b.full_name;
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredResults(filtered);
  }, [results, searchTerm, sortBy, sortOrder]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getResults();
      setResults(response.data.results || []);
    } catch (error: any) {
      toast.error('Failed to load results');
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTopParticipants = (gender: 'male' | 'female', limit: number = 3) => {
    return filteredResults
      .filter(result => result.gender === gender)
      .slice(0, limit);
  };

  const handleExportResults = () => {
    const csvContent = [
      ['Rank', 'Registration Number', 'Name', 'Gender', 'Institution', 'Average Marks', 'Evaluation Count', 'Min Marks', 'Max Marks', 'Comments'],
      ...filteredResults.map((result, index) => [
        index + 1,
        result.registration_number,
        result.full_name,
        result.gender,
        result.institution || 'N/A',
        result.average_marks,
        result.evaluation_count,
        result.min_marks,
        result.max_marks,
        result.all_comments || 'N/A'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `results_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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

  const topBoys = getTopParticipants('male', 3);
  const topGirls = getTopParticipants('female', 3);
  const top20Boys = getTopParticipants('male', 20);
  const top20Girls = getTopParticipants('female', 20);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">View Results</h1>
                <p className="text-gray-600">Competition results and rankings</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleExportResults}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </button>
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Top 3 Winners */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top 3 Boys */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center">
                <Trophy className="w-5 h-5 mr-2 text-blue-600" />
                Top 3 Boys
              </h3>
              <div className="space-y-3">
                {topBoys.map((result, index) => (
                  <div key={result.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{result.full_name}</div>
                        <div className="text-sm text-gray-500">{result.registration_number}</div>
                      </div>
                    </div>
                    <div className="text-lg font-bold text-gray-900">{result.average_marks.toFixed(2)}</div>
                  </div>
                ))}
                {topBoys.length === 0 && (
                  <div className="text-center py-4 text-gray-500">No boys evaluated yet</div>
                )}
              </div>
            </div>
          </div>

          {/* Top 3 Girls */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center">
                <Trophy className="w-5 h-5 mr-2 text-pink-600" />
                Top 3 Girls
              </h3>
              <div className="space-y-3">
                {topGirls.map((result, index) => (
                  <div key={result.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{result.full_name}</div>
                        <div className="text-sm text-gray-500">{result.registration_number}</div>
                      </div>
                    </div>
                    <div className="text-lg font-bold text-gray-900">{result.average_marks.toFixed(2)}</div>
                  </div>
                ))}
                {topGirls.length === 0 && (
                  <div className="text-center py-4 text-gray-500">No girls evaluated yet</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Search and Sort */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex-1 max-w-lg">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search participants..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex space-x-4">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'total_score' | 'participant_name')}
                  className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="total_score">Sort by Score</option>
                  <option value="participant_name">Sort by Name</option>
                </select>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                  className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">All Results</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Registration #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score Range
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Institution
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredResults.map((result, index) => (
                    <tr key={result.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.registration_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.full_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          result.gender === 'male' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-pink-100 text-pink-800'
                        }`}>
                          {result.gender}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {result.average_marks.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.evaluation_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="text-xs">
                          <div>Min: {result.min_marks}</div>
                          <div>Max: {result.max_marks}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.institution || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredResults.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-500">
                  {searchTerm ? 'No results found matching your search.' : 'No evaluations completed yet.'}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
