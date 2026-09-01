'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { Search, User, BookOpen, Save, CheckCircle, AlertCircle, Edit3, Eye } from 'lucide-react';
import { participantsAPI, evaluationsAPI, adminAPI } from '@/lib/api';
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
}

interface EvaluationMarks {
  introduction: number;
  content: number;
  conclusion: number;
  handwriting: number;
  grammar_spelling: number;
  special_points: number;
}

interface Evaluation {
  id?: number;
  participant_id: number;
  evaluator_id: number;
  introduction_marks: number;
  content_marks: number;
  conclusion_marks: number;
  handwriting_marks: number;
  grammar_marks: number;
  special_points: number;
  total_marks: number;
  comments?: string;
  is_submitted: boolean;
  created_at?: string;
  updated_at?: string;
}

interface CompetitionSettings {
  introduction_max?: { value: string };
  content_max?: { value: string };
  conclusion_max?: { value: string };
  handwriting_max?: { value: string };
  grammar_max?: { value: string };
  special_points_max?: { value: string };
}

export default function EvaluatorPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [marks, setMarks] = useState<EvaluationMarks>({
    introduction: 0,
    content: 0,
    conclusion: 0,
    handwriting: 0,
    grammar_spelling: 0,
    special_points: 0
  });
  const [comments, setComments] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [competitionSettings, setCompetitionSettings] = useState<CompetitionSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'evaluator')) {
      router.push('/login');
    } else if (user && user.role === 'evaluator') {
      fetchCompetitionSettings();
    }
  }, [user, loading, router]);

  const fetchCompetitionSettings = async () => {
    try {
      setSettingsLoading(true);
      const response = await adminAPI.getSettings();
      setCompetitionSettings(response.data.settings || {});
    } catch (error: any) {
      console.error('Failed to fetch competition settings:', error);
      toast.error('Failed to load competition settings. Using default values.');
      // Set default values as fallback - matching backend validation limits
      setCompetitionSettings({
        introduction_max: { value: '10' },
        content_max: { value: '50' },  // Backend validation: "Content marks must be between 0 and 50"
        conclusion_max: { value: '10' },
        handwriting_max: { value: '10' },
        grammar_max: { value: '10' },
        special_points_max: { value: '10' }
      });
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setParticipant(null);
      setEvaluation(null);
      setMarks({
        introduction: 0,
        content: 0,
        conclusion: 0,
        handwriting: 0,
        grammar_spelling: 0,
        special_points: 0
      });
      setComments('');
      return;
    }

    setIsSearching(true);
    try {
      const response = await participantsAPI.validate(searchTerm.trim());
      const participantData = response.data.participant;
      
      if (participantData) {
        setParticipant(participantData);
        
        // Check if evaluation already exists
        try {
          const evalResponse = await evaluationsAPI.getByParticipantRegistrationNumber(participantData.registration_number);
          if (evalResponse.data.evaluation) {
            const existingEval = evalResponse.data.evaluation;
            setEvaluation(existingEval);
            setMarks({
              introduction: existingEval.introduction_marks,
              content: existingEval.content_marks,
              conclusion: existingEval.conclusion_marks,
              handwriting: existingEval.handwriting_marks,
              grammar_spelling: existingEval.grammar_marks,
              special_points: existingEval.special_points
            });
            setComments(existingEval.comments || '');
            setIsEditing(false);
            toast.success('Existing evaluation found');
          } else {
            // No existing evaluation, reset to defaults
            setEvaluation(null);
            setMarks({
              introduction: 0,
              content: 0,
              conclusion: 0,
              handwriting: 0,
              grammar_spelling: 0,
              special_points: 0
            });
            setComments('');
            setIsEditing(true);
            toast.success('Participant found - ready for evaluation');
          }
        } catch (error) {
          // No existing evaluation
          setEvaluation(null);
          setMarks({
            introduction: 0,
            content: 0,
            conclusion: 0,
            handwriting: 0,
            grammar_spelling: 0,
            special_points: 0
          });
          setComments('');
          setIsEditing(true);
          toast.success('Participant found - ready for evaluation');
        }
      } else {
        toast.error('Participant not found');
        setParticipant(null);
        setEvaluation(null);
      }
    } catch (error: any) {
      console.error('Search error:', error);
      toast.error(error.response?.data?.error || 'Search failed');
      setParticipant(null);
      setEvaluation(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleMarkChange = (category: keyof EvaluationMarks, value: number) => {
    const maxMarks = getMaxMarks(category);
    
    // Handle NaN values
    if (isNaN(value)) {
      value = 0;
    }
    
    const clampedValue = Math.max(0, Math.min(maxMarks, value));
    
    setMarks(prev => ({
      ...prev,
      [category]: clampedValue
    }));
  };

  const getMaxMarks = (category: keyof EvaluationMarks): number => {
    if (!competitionSettings) {
      // Fallback to default values if settings not loaded - matching backend validation limits
      const defaultMarks = {
        introduction: 10,
        content: 50,  // Backend validation: "Content marks must be between 0 and 50"
        conclusion: 10,
        handwriting: 10,
        grammar_spelling: 10,
        special_points: 10
      };
      return defaultMarks[category];
    }

    // Map frontend category names to backend setting names
    const settingMap = {
      introduction: 'introduction_max',
      content: 'content_max',
      conclusion: 'conclusion_max',
      handwriting: 'handwriting_max',
      grammar_spelling: 'grammar_max',
      special_points: 'special_points_max'
    };

    const settingName = settingMap[category];
    const setting = competitionSettings[settingName as keyof CompetitionSettings];
    const value = setting?.value;
    
    if (value && !isNaN(parseInt(value))) {
      return parseInt(value);
    }

    // Fallback to default values if setting not found or invalid
    // Note: These defaults match the backend validation limits
    const defaultMarks = {
      introduction: 10,
      content: 50,  // Backend validation: "Content marks must be between 0 and 50"
      conclusion: 10,
      handwriting: 10,
      grammar_spelling: 10,
      special_points: 10
    };
    return defaultMarks[category];
  };

  const calculateTotal = (): number => {
    return Object.values(marks).reduce((sum, mark) => sum + mark, 0);
  };

  const handleSave = async () => {
    if (!participant) return;

    // Validate that all marks are provided
    const totalMarks = calculateTotal();
    if (totalMarks === 0) {
      toast.error('Please enter marks for at least one category before saving');
      return;
    }

    setIsSaving(true);
    try {
      const evaluationData = {
        participant_registration_number: participant.registration_number,
        evaluator_id: user?.id,
        introduction_marks: marks.introduction,
        content_marks: marks.content,
        conclusion_marks: marks.conclusion,
        handwriting_marks: marks.handwriting,
        grammar_marks: marks.grammar_spelling, // Fix field name mismatch
        special_points: marks.special_points,
        total_marks: calculateTotal(),
        comments: comments.trim()
      };

      if (evaluation?.id) {
        // Update existing evaluation
        await evaluationsAPI.update(evaluation.id, evaluationData);
        toast.success('Evaluation updated successfully');
      } else {
        // Create new evaluation
        const response = await evaluationsAPI.create(evaluationData);
        setEvaluation(response.data.evaluation);
        toast.success('Evaluation saved successfully');
      }
      
      setIsEditing(false);
    } catch (error: any) {
      console.error('Save error:', error);
      console.error('Error response:', error.response?.data);
      
      // Provide more specific error messages
      if (error.response?.data?.error) {
        toast.error(`Save failed: ${error.response.data.error}`);
      } else if (error.response?.data?.non_field_errors) {
        toast.error(`Save failed: ${error.response.data.non_field_errors.join(', ')}`);
      } else if (error.response?.data) {
        // Handle field-specific validation errors
        const fieldErrors = Object.entries(error.response.data)
          .filter(([key, value]) => Array.isArray(value))
          .map(([key, value]) => `${key}: ${(value as string[]).join(', ')}`)
          .join('; ');
        
        if (fieldErrors) {
          toast.error(`Validation error: ${fieldErrors}`);
        } else {
          toast.error('Failed to save evaluation. Please check your input.');
        }
      } else {
        toast.error('Failed to save evaluation. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = () => {
    if (!participant) return;
    
    // Validate that evaluation exists and has marks
    if (!evaluation?.id) {
      toast.error('Please save the evaluation first before submitting');
      return;
    }
    
    const totalMarks = calculateTotal();
    if (totalMarks === 0) {
      toast.error('Please enter marks for at least one category before submitting');
      return;
    }
    
    setShowConfirmDialog(true);
  };

  const confirmSubmit = async () => {
    if (!participant || !evaluation?.id) return;

    setIsSubmitting(true);
    try {
      await evaluationsAPI.confirm(evaluation.id);
      toast.success('Evaluation submitted and confirmed successfully!');
      
      // Refresh evaluation data
      const evalResponse = await evaluationsAPI.getByParticipantRegistrationNumber(participant.registration_number);
      if (evalResponse.data.evaluation) {
        setEvaluation(evalResponse.data.evaluation);
      }
      
      setShowConfirmDialog(false);
    } catch (error: any) {
      console.error('Submit error:', error);
      console.error('Error response:', error.response?.data);
      
      // Provide more specific error messages
      if (error.response?.data?.error) {
        toast.error(`Submit failed: ${error.response.data.error}`);
      } else if (error.response?.data?.non_field_errors) {
        toast.error(`Submit failed: ${error.response.data.non_field_errors.join(', ')}`);
      } else if (error.response?.data) {
        // Handle field-specific validation errors
        const fieldErrors = Object.entries(error.response.data)
          .filter(([key, value]) => Array.isArray(value))
          .map(([key, value]) => `${key}: ${(value as string[]).join(', ')}`)
          .join('; ');
        
        if (fieldErrors) {
          toast.error(`Validation error: ${fieldErrors}`);
        } else {
          toast.error('Failed to submit evaluation. Please check your input.');
        }
      } else {
        toast.error('Failed to submit evaluation. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setParticipant(null);
    setEvaluation(null);
    setMarks({
      introduction: 0,
      content: 0,
      conclusion: 0,
      handwriting: 0,
      grammar_spelling: 0,
      special_points: 0
    });
    setComments('');
    setIsEditing(false);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  if (loading || settingsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {loading ? 'Loading...' : 'Loading competition settings...'}
          </p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'evaluator') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Evaluator Portal</h1>
              <p className="text-sm text-gray-600">Search participants and evaluate essays</p>
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
                Search by Registration Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  id="search"
                  placeholder="Enter registration number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Enter the participant's registration number to start evaluation
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

        {/* Participant Details and Evaluation Form */}
        {participant && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Participant Information */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Participant Details</h3>
              </div>
              <div className="px-6 py-6 space-y-4">
                

                <div className="flex items-center space-x-3">
                  <BookOpen className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Registration Number</p>
                    <p className="text-sm text-gray-600 font-mono">{participant.registration_number}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Gender</p>
                    <p className="text-sm text-gray-600 capitalize">{participant.gender}</p>
                  </div>
                </div>

                

                {evaluation && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-blue-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-blue-800">
                          {evaluation.is_submitted ? 'Evaluation Submitted' : 'Evaluation Saved'}
                        </p>
                        <p className="text-xs text-blue-700">
                          {evaluation.is_submitted 
                            ? 'This evaluation has been submitted and confirmed'
                            : 'This evaluation is saved but not yet submitted'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Evaluation Form */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Evaluation Marks</h3>
                  {evaluation && !isEditing && !evaluation.is_submitted && (
                    <button
                      onClick={handleEdit}
                      className="flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                    >
                      <Edit3 className="h-4 w-4 mr-1" />
                      Edit
                    </button>
                  )}
                </div>
              </div>
              <div className="px-6 py-6 space-y-6">
                {/* Evaluation Categories */}
                {Object.entries(marks).map(([category, value]) => (
                  <div key={category} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-gray-700 capitalize">
                        {category.replace('_', ' ')} 
                        <span className="text-gray-500">(Max: {getMaxMarks(category as keyof EvaluationMarks)})</span>
                      </label>
                      <span className="text-sm text-gray-600">{value}</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max={getMaxMarks(category as keyof EvaluationMarks)}
                      value={value}
                      onChange={(e) => handleMarkChange(category as keyof EvaluationMarks, parseInt(e.target.value) || 0)}
                      disabled={!isEditing && evaluation?.is_submitted}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                    {value > getMaxMarks(category as keyof EvaluationMarks) && (
                      <p className="text-sm text-red-600">
                        Value exceeds maximum allowed ({getMaxMarks(category as keyof EvaluationMarks)})
                      </p>
                    )}
                  </div>
                ))}

                {/* Total Marks */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-gray-900">Total Marks</span>
                    <span className="text-2xl font-bold text-blue-600">{calculateTotal()}</span>
                  </div>
                </div>

                {/* Comments */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Comments (Optional)</label>
                  <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    disabled={!isEditing && evaluation?.is_submitted}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Add any comments about the evaluation..."
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3 pt-4">
                  {isEditing && (
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </>
                      )}
                    </button>
                  )}

                  {evaluation && !evaluation.is_submitted && (
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Submitting...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Submit & Confirm
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No Results Message */}
        {searchTerm && !participant && !isSearching && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Participant Not Found</h3>
              <p className="text-gray-600">
                No participant found with registration number "{searchTerm}". Please check the number and try again.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                <AlertCircle className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">Confirm Submission</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to submit and confirm this evaluation? This action cannot be undone.
                </p>
                <div className="mt-4 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm font-medium text-gray-900">Total Marks: {calculateTotal()}</p>
                  <p className="text-xs text-gray-600">Participant: {participant?.full_name}</p>
                </div>
              </div>
              <div className="flex space-x-3 mt-4">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSubmit}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Confirm Submit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
