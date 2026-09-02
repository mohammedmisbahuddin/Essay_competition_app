'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { Search, User, Phone, Mail, Calendar, BookOpen, UserCheck, AlertCircle, Plus, CheckCircle, X, Users, UserX } from 'lucide-react';
import { participantsAPI, adminAPI } from '@/lib/api';
import toast from 'react-hot-toast';

interface Participant {
  id: number;
  registration_number: string;
  full_name: string;
  email: string;
  phone: string;
  gender: string;
  age: number;
  qualification: string;
  father_name: string;
  registration_timestamp: string;
  is_spot_registration: boolean;
  attendance_marked?: boolean;
  attendance_marked_at?: string;
}

interface SpotRegistrationForm {
  full_name: string;
  age: string;
  qualification: string;
  gender: string;
  father_name: string;
  email: string;
  phone: string;
}

export default function RegistrationPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Participant[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSpotRegistration, setShowSpotRegistration] = useState(false);
  const [isSubmittingSpot, setIsSubmittingSpot] = useState(false);
  const [spotForm, setSpotForm] = useState<SpotRegistrationForm>({
    full_name: '',
    age: '',
    qualification: '',
    gender: '',
    father_name: '',
    email: '',
    phone: ''
  });
  const [attendanceStats, setAttendanceStats] = useState({
    total_participants: 0,
    present_participants: 0,
    absent_participants: 0,
    attendance_percentage: 0
  });
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [apiError, setApiError] = useState<string>('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'registration_desk')) {
      router.push('/login');
    } else if (!loading && user && user.role === 'registration_desk') {
      fetchAttendanceStats();
    }
  }, [user, loading, router]);

  const fetchAttendanceStats = async () => {
    try {
      const response = await adminAPI.getStats();
      const stats = response.data.stats;
      
      setAttendanceStats({
        total_participants: stats.total_participants,
        present_participants: stats.present_participants,
        absent_participants: stats.absent_participants,
        attendance_percentage: stats.attendance_percentage
      });
    } catch (error: any) {
      console.error('Error fetching attendance stats:', error);
    }
  };

  const validateSpotRegistrationForm = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    // Required field validations
    if (!spotForm.full_name.trim()) {
      errors.full_name = 'Full name is required';
    } else if (spotForm.full_name.trim().length < 2) {
      errors.full_name = 'Full name must be at least 2 characters';
    }
    
    if (!spotForm.age.trim()) {
      errors.age = 'Age is required';
    } else {
      const age = parseInt(spotForm.age);
      if (isNaN(age) || age < 1 || age > 120) {
        errors.age = 'Age must be a valid number between 1 and 120';
      }
    }
    
    if (!spotForm.gender.trim()) {
      errors.gender = 'Gender is required';
    } else if (!['male', 'female', 'other'].includes(spotForm.gender)) {
      errors.gender = 'Please select a valid gender';
    }
    
    // Optional field validations
    if (spotForm.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(spotForm.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (spotForm.phone.trim() && !/^[0-9+\-\s()]{10,15}$/.test(spotForm.phone.trim())) {
      errors.phone = 'Please enter a valid phone number (10-15 digits)';
    }
    
    if (spotForm.qualification.trim() && spotForm.qualification.trim().length < 2) {
      errors.qualification = 'Qualification must be at least 2 characters if provided';
    }
    
    if (spotForm.father_name.trim() && spotForm.father_name.trim().length < 2) {
      errors.father_name = 'Father\'s name must be at least 2 characters if provided';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await participantsAPI.search(searchTerm);
      setSearchResults(response.data.participants || []);
      
      if (response.data.participants?.length === 0) {
        toast.error('No participants found');
      } else {
        toast.success(`Found ${response.data.participants?.length} participant(s)`);
      }
    } catch (error: any) {
      console.error('Search error:', error);
      toast.error(error.response?.data?.error || 'Search failed');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleParticipantSelect = (participant: Participant) => {
    setSelectedParticipant(participant);
  };

  const handleMarkPresent = async () => {
    if (!selectedParticipant) return;

    try {
      const response = await participantsAPI.markPresent(selectedParticipant.id);
      toast.success(`${selectedParticipant.full_name} marked as present!`);

      // Refresh attendance stats
      fetchAttendanceStats();

      // Update the selected participant's status
      setSelectedParticipant({
        ...selectedParticipant,
        ...response.data.participant
      });

    } catch (error: any) {
      console.error('Mark present error:', error);
      toast.error(error.response?.data?.error || 'Failed to mark participant as present');
    }
  };

  const handleSpotRegistration = async () => {
    // Clear previous errors
    setValidationErrors({});
    setApiError('');
    
    // Validate form
    if (!validateSpotRegistrationForm()) {
      toast.error('Please fix the validation errors before submitting');
      return;
    }

    setIsSubmittingSpot(true);
    try {
      const participantData = {
        full_name: spotForm.full_name.trim(),
        age: parseInt(spotForm.age),
        qualification: spotForm.qualification.trim() || '',
        gender: spotForm.gender.trim(),
        father_name: spotForm.father_name.trim() || '',
        email: spotForm.email.trim() || '',
        phone: spotForm.phone.trim() || '',
        is_spot_registration: true
      };

      console.log('🔍 Spot registration data being sent:', participantData);
      
      const response = await participantsAPI.create(participantData);
      console.log('🔍 Spot registration response:', response);
      console.log('🔍 Response data:', response.data);
      
      // Handle different possible response structures
      const newParticipant = response.data.participant || response.data || response.data.data;
      
      if (!newParticipant) {
        console.error('🚨 No participant data in response:', response.data);
        throw new Error('Invalid response from server - no participant data received');
      }
      
      if (!newParticipant.registration_number) {
        console.error('🚨 No registration number in participant data:', newParticipant);
        throw new Error('Invalid response from server - no registration number received');
      }
      
      toast.success(`Spot registration successful! Registration number: ${newParticipant.registration_number}`);
      
      // Refresh attendance stats
      fetchAttendanceStats();
      
      // Reset form and close modal
      setSpotForm({
        full_name: '',
        age: '',
        qualification: '',
        gender: '',
        father_name: '',
        email: '',
        phone: ''
      });
      setShowSpotRegistration(false);
      
    } catch (error: any) {
      console.error('🚨 Spot registration error:', error);
      console.error('🚨 Error response:', error.response);
      console.error('🚨 Error response data:', error.response?.data);
      console.error('🚨 Error status:', error.response?.status);
      
      // Extract detailed error information
      let errorMessage = 'Failed to register participant';
      let errorDetails = '';
      
      if (error.response?.data) {
        const errorData = error.response.data;
        console.log('🔍 Error data structure:', errorData);
        
        // Handle different types of API errors
        if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        }
        
        // Handle validation errors from backend
        if (Array.isArray(errorData.errors)) {
          // express-validator shape: [{ msg, param, ... }]
          errorDetails = errorData.errors.map((e: any) => e.msg || e.param).join(', ');
        } else if (errorData.errors) {
          errorDetails = Object.values(errorData.errors).flat().join(', ');
        } else if (errorData.field_errors) {
          errorDetails = Object.entries(errorData.field_errors)
            .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
            .join('; ');
        } else if (errorData.validation_errors) {
          errorDetails = Object.entries(errorData.validation_errors)
            .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
            .join('; ');
        }
        
        // Handle duplicate participant error
        if (errorData.error === 'Participant already exists' && errorData.existing_participant) {
          const existing = errorData.existing_participant;
          errorMessage = `Participant already exists! Registration Number: ${existing.registration_number}`;
        }
        
        // Handle specific HTTP status codes
        if (error.response.status === 400) {
          errorMessage = 'Invalid data provided. Please check your input.';
        } else if (error.response.status === 409) {
          errorMessage = 'Participant already exists with this information.';
        } else if (error.response.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        }
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      // Set API error for display
      setApiError(errorDetails ? `${errorMessage}. Details: ${errorDetails}` : errorMessage);
      
      // Show toast with error
      toast.error(errorMessage);
      
    } finally {
      setIsSubmittingSpot(false);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    setSelectedParticipant(null);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const openSpotRegistration = () => {
    setShowSpotRegistration(true);
  };

  const closeSpotRegistration = () => {
    setShowSpotRegistration(false);
    setValidationErrors({});
    setApiError('');
    setSpotForm({
      full_name: '',
      age: '',
      qualification: '',
      gender: '',
      father_name: '',
      email: '',
      phone: ''
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'registration_desk') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Left Section - Title */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">Registration Desk</h1>
              <p className="text-sm text-gray-600">Search participants, validate details, and handle spot registrations</p>
            </div>
            
            {/* Center Section - Logo */}
            <div className="flex justify-center flex-1">
              <img 
                src="/BCA.png"
                alt="PCWT Logo" 
                className="h-12 w-auto object-contain"
              />
            </div>
            
            {/* Right Section - User Info */}
            <div className="flex justify-end items-center space-x-4 flex-1">
              <span className="text-sm text-gray-600">Welcome, {user.username}</span>
              <button
                onClick={() => router.push('/login')}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Attendance Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Participants</dt>
                    <dd className="text-lg font-medium text-gray-900">{attendanceStats.total_participants}</dd>
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
                    <dt className="text-sm font-medium text-gray-500 truncate">Present Participants</dt>
                    <dd className="text-lg font-medium text-gray-900">{attendanceStats.present_participants}</dd>
                    <dd className="text-sm text-gray-500">
                      {attendanceStats.attendance_percentage.toFixed(1)}% attendance rate
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
                    <dd className="text-lg font-medium text-gray-900">{attendanceStats.absent_participants}</dd>
                    <dd className="text-sm text-gray-500">
                      {attendanceStats.total_participants > 0 
                        ? `${Math.round((attendanceStats.absent_participants / attendanceStats.total_participants) * 100)}%`
                        : '0%'
                      }
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search Participant
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  id="search"
                  placeholder="Search by name, registration number, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Search for existing participants or register new ones on the spot
              </p>
            </div>
            <div className="flex flex-col space-y-2">
              <button
                onClick={handleSearch}
                disabled={isSearching || !searchTerm.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isSearching ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </>
                )}
              </button>
              <button
                onClick={openSpotRegistration}
                className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Spot Registration
              </button>
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Search Results ({searchResults.length})
              </h3>
            </div>
            <div className="divide-y divide-gray-200">
              {searchResults.map((participant) => (
                <div
                  key={participant.id}
                  onClick={() => handleParticipantSelect(participant)}
                  className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          {participant.full_name}
                        </h4>
                        <p className="text-sm text-gray-500">
                          Registration: {participant.registration_number}
                        </p>
                        <p className="text-sm text-gray-500">
                          {participant.email} • {participant.phone}
                        </p>
                        {participant.is_spot_registration && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
                            Spot Registration
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center text-green-600">
                      <UserCheck className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected Participant Details */}
        {selectedParticipant && (
          <div className="bg-white rounded-lg shadow-sm border mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Participant Details</h3>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleMarkPresent}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark Present
                  </button>
                  <button
                    onClick={() => setSelectedParticipant(null)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
            <div className="px-6 py-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-900 border-b pb-2">Basic Information</h4>
                  
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Full Name</p>
                      <p className="text-sm text-gray-600">{selectedParticipant.full_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <BookOpen className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Registration Number</p>
                      <p className="text-sm text-gray-600 font-mono">{selectedParticipant.registration_number}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Age</p>
                      <p className="text-sm text-gray-600">{selectedParticipant.age || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <BookOpen className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Qualification</p>
                      <p className="text-sm text-gray-600">{selectedParticipant.qualification || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Gender</p>
                      <p className="text-sm text-gray-600 capitalize">{selectedParticipant.gender || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-900 border-b pb-2">Contact Information</h4>
                  
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Email</p>
                      <p className="text-sm text-gray-600">{selectedParticipant.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Phone</p>
                      <p className="text-sm text-gray-600">{selectedParticipant.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Father's Name</p>
                      <p className="text-sm text-gray-600">{selectedParticipant.father_name || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Registration Date</p>
                      <p className="text-sm text-gray-600">
                        {selectedParticipant.registration_timestamp 
                          ? new Date(selectedParticipant.registration_timestamp).toLocaleDateString()
                          : 'N/A'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Registration Status */}
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <div>
                    <h4 className="text-sm font-medium text-green-800">Participant Verified</h4>
                    <p className="text-sm text-green-700">
                      This participant is registered and eligible for the competition.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No Results Message */}
        {searchTerm && searchResults.length === 0 && !isSearching && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Participants Found</h3>
              <p className="text-gray-600 mb-4">
                No participants match your search criteria. You can register them on the spot.
              </p>
              <button
                onClick={openSpotRegistration}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Register New Participant
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Spot Registration Modal */}
      {showSpotRegistration && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Spot Registration</h3>
                <button
                  onClick={closeSpotRegistration}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              {/* API Error Display */}
              {apiError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Registration Error</h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>{apiError}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={spotForm.full_name}
                      onChange={(e) => setSpotForm(prev => ({ ...prev, full_name: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                        validationErrors.full_name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter full name"
                    />
                    {validationErrors.full_name && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.full_name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Age *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={spotForm.age}
                      onChange={(e) => setSpotForm(prev => ({ ...prev, age: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                        validationErrors.age ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter age"
                    />
                    {validationErrors.age && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.age}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gender *
                    </label>
                    <select
                      value={spotForm.gender}
                      onChange={(e) => setSpotForm(prev => ({ ...prev, gender: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                        validationErrors.gender ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                    {validationErrors.gender && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.gender}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Qualification
                    </label>
                    <input
                      type="text"
                      value={spotForm.qualification}
                      onChange={(e) => setSpotForm(prev => ({ ...prev, qualification: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                        validationErrors.qualification ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter qualification"
                    />
                    {validationErrors.qualification && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.qualification}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Father's Name
                    </label>
                    <input
                      type="text"
                      value={spotForm.father_name}
                      onChange={(e) => setSpotForm(prev => ({ ...prev, father_name: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                        validationErrors.father_name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter father's name"
                    />
                    {validationErrors.father_name && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.father_name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={spotForm.email}
                      onChange={(e) => setSpotForm(prev => ({ ...prev, email: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                        validationErrors.email ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter email"
                    />
                    {validationErrors.email && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={spotForm.phone}
                      onChange={(e) => setSpotForm(prev => ({ ...prev, phone: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                        validationErrors.phone ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter phone number"
                    />
                    {validationErrors.phone && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.phone}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={closeSpotRegistration}
                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSpotRegistration}
                    disabled={isSubmittingSpot}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isSubmittingSpot ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Registering...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Register Participant
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
