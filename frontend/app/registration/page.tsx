'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { Search, User, Phone, Mail, Calendar, BookOpen, UserCheck, AlertCircle, Plus, CheckCircle, X } from 'lucide-react';
import { participantsAPI } from '@/lib/api';
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
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'registration_desk')) {
      router.push('/login');
    }
  }, [user, loading, router]);

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
      await participantsAPI.markPresent(selectedParticipant.id);
      toast.success(`${selectedParticipant.full_name} marked as present!`);
      
      // Optionally refresh participant data to show updated status
      // You could add a visual indicator here
      
    } catch (error: any) {
      console.error('Mark present error:', error);
      toast.error('Failed to mark participant as present');
    }
  };

  const handleSpotRegistration = async () => {
    if (!spotForm.full_name.trim() || !spotForm.age.trim() || !spotForm.gender.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmittingSpot(true);
    try {
      const participantData = {
        full_name: spotForm.full_name.trim(),
        age: parseInt(spotForm.age),
        qualification: spotForm.qualification.trim(),
        gender: spotForm.gender.trim(),
        father_name: spotForm.father_name.trim(),
        email: spotForm.email.trim(),
        phone: spotForm.phone.trim(),
        is_spot_registration: true
      };

      const response = await participantsAPI.create(participantData);
      const newParticipant = response.data.participant;
      
      toast.success(`Spot registration successful! Registration number: ${newParticipant.registration_number}`);
      
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
      
      // Optionally, you could automatically search for the newly created participant
      // setSearchTerm(newParticipant.registration_number);
      // handleSearch();
      
    } catch (error: any) {
      console.error('Spot registration error:', error);
      
      // Handle duplicate participant error
      if (error.response?.data?.error === 'Participant already exists' && error.response?.data?.existing_participant) {
        const existing = error.response.data.existing_participant;
        toast.error(`Participant already exists! Registration Number: ${existing.registration_number}`);
      } else {
        toast.error(error.response?.data?.error || 'Failed to register participant');
      }
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
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Registration Desk</h1>
              <p className="text-sm text-gray-600">Search participants, validate details, and handle spot registrations</p>
            </div>
            <div className="flex items-center space-x-4">
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Age *
                    </label>
                    <input
                      type="number"
                      value={spotForm.age}
                      onChange={(e) => setSpotForm(prev => ({ ...prev, age: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter age"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gender *
                    </label>
                    <select
                      value={spotForm.gender}
                      onChange={(e) => setSpotForm(prev => ({ ...prev, gender: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Qualification
                    </label>
                    <input
                      type="text"
                      value={spotForm.qualification}
                      onChange={(e) => setSpotForm(prev => ({ ...prev, qualification: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter qualification"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Father's Name
                    </label>
                    <input
                      type="text"
                      value={spotForm.father_name}
                      onChange={(e) => setSpotForm(prev => ({ ...prev, father_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter father's name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={spotForm.email}
                      onChange={(e) => setSpotForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter email"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={spotForm.phone}
                      onChange={(e) => setSpotForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter phone number"
                    />
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
