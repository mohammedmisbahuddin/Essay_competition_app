'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Settings as SettingsIcon, Users, Upload, Save, Plus, Edit, Trash2, Eye, EyeOff, AlertTriangle, Download } from 'lucide-react';
import { adminAPI } from '@/lib/api';
import toast from 'react-hot-toast';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  full_name: string;
  is_active: boolean;
  date_joined: string;
}

interface CompetitionSettings {
  competition_name: { value: string; description: string };
  competition_date: { value: string; description: string };
  registration_deadline: { value: string; description: string };
  max_participants: { value: string; description: string };
  introduction_max: { value: string; description: string };
  content_max: { value: string; description: string };
  conclusion_max: { value: string; description: string };
  handwriting_max: { value: string; description: string };
  grammar_max: { value: string; description: string };
  special_points_max: { value: string; description: string };
}

export default function Settings() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'settings' | 'users' | 'danger'>('settings');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<CompetitionSettings | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showPassword, setShowPassword] = useState<{ [key: number]: boolean }>({});
  
  // User form states
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    role: 'invigilator'
  });

  // Clear all data states
  const [showClearDataModal, setShowClearDataModal] = useState(false);
  const [clearDataStep, setClearDataStep] = useState(1);
  const [clearDataConfirmCode, setClearDataConfirmCode] = useState('');
  const [isClearingData, setIsClearingData] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/login');
    } else if (user && user.role === 'admin') {
      fetchData();
    }
  }, [user, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [settingsResponse, usersResponse] = await Promise.all([
        adminAPI.getSettings(),
        adminAPI.getUsers()
      ]);
      
      setSettings(settingsResponse.data.settings || {});
      setUsers(usersResponse.data.users || []);
    } catch (error: any) {
      toast.error('Failed to load data');
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log('File input changed:', file);
    if (file) {
      console.log('File selected:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      });
      setSelectedFile(file);
    } else {
      console.log('No file selected');
      setSelectedFile(null);
    }
  };

  const handleImportFromCSV = async () => {
    if (!selectedFile) {
      toast.error('Please select a CSV file');
      return;
    }

    // Debug: Log file details
    console.log('Selected file:', {
      name: selectedFile.name,
      size: selectedFile.size,
      type: selectedFile.type,
      lastModified: selectedFile.lastModified
    });

    try {
      const response = await adminAPI.importFromCSV(selectedFile);
      toast.success(`Successfully imported ${response.data.results.created} participants`);
      setSelectedFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('csv-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error: any) {
      console.error('CSV import error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      // More detailed error handling
      if (error.response?.data?.error) {
        toast.error(`CSV Import Error: ${error.response.data.error}`);
      } else if (error.response?.status === 403) {
        toast.error('Access denied: Admin role required');
      } else if (error.response?.status === 400) {
        toast.error('Bad request: Please check your CSV file format');
      } else {
        toast.error('Failed to import CSV. Please try again.');
      }
    }
  };

  const handleUpdateSettings = async () => {
    try {
      const settingsToUpdate: any = {};
      if (settings) {
        Object.keys(settings).forEach(key => {
          settingsToUpdate[key] = settings[key as keyof CompetitionSettings].value;
        });
      }

      await adminAPI.updateSettings({ settings: settingsToUpdate });
      toast.success('Settings updated successfully');
    } catch (error: any) {
      toast.error('Failed to update settings');
      console.error('Update settings error:', error);
    }
  };

  const handleCreateUser = async () => {
    try {
      await adminAPI.createUser(userForm);
      toast.success('User created successfully');
      setIsCreatingUser(false);
      setUserForm({ username: '', password: '', role: 'invigilator' });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create user');
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      await adminAPI.updateUser(editingUser.id, userForm);
      toast.success('User updated successfully');
      setEditingUser(null);
      setUserForm({ username: '', password: '', role: 'invigilator' });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      await adminAPI.deleteUser(userId);
      toast.success('User deleted successfully');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete user');
    }
  };

  const startEditUser = (user: User) => {
    setEditingUser(user);
    setUserForm({
      username: user.username,
      password: '',
      role: user.role
    });
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setIsCreatingUser(false);
    setUserForm({ username: '', password: '', role: 'invigilator' });
  };

  const togglePasswordVisibility = (userId: number) => {
    setShowPassword(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'registration_desk': return 'bg-blue-100 text-blue-800';
      case 'invigilator': return 'bg-green-100 text-green-800';
      case 'evaluator': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Clear all data handlers
  const handleClearAllData = async () => {
    if (clearDataStep === 1) {
      setClearDataStep(2);
      return;
    }

    if (clearDataStep === 2) {
      if (clearDataConfirmCode !== 'CLEAR_ALL_DATA_CONFIRM') {
        toast.error('Invalid confirmation code. Please enter the exact code: CLEAR_ALL_DATA_CONFIRM');
        return;
      }

      setIsClearingData(true);
      try {
        await adminAPI.clearAllData(clearDataConfirmCode);
        toast.success('All data has been cleared successfully');
        setShowClearDataModal(false);
        setClearDataStep(1);
        setClearDataConfirmCode('');
        
        // Refresh the page to reflect cleared data
        window.location.reload();
      } catch (error: any) {
        console.error('Clear data error:', error);
        toast.error(error.response?.data?.error || 'Failed to clear all data');
      } finally {
        setIsClearingData(false);
      }
    }
  };

  const resetClearDataModal = () => {
    setShowClearDataModal(false);
    setClearDataStep(1);
    setClearDataConfirmCode('');
    setIsClearingData(false);
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'registration_desk': return 'Registration Desk';
      case 'invigilator': return 'Invigilator';
      case 'evaluator': return 'Evaluator';
      default: return role;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="mr-4 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-sm text-gray-500">Manage competition settings and users</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <SettingsIcon className="h-5 w-5 inline mr-2" />
              Competition Settings
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="h-5 w-5 inline mr-2" />
              User Management
            </button>
            <button
              onClick={() => setActiveTab('danger')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'danger'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-red-500 hover:text-red-700 hover:border-red-300'
              }`}
            >
              <AlertTriangle className="h-5 w-5 inline mr-2" />
              Danger Zone
            </button>
          </nav>
        </div>

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-8">
            {/* CSV Import Section */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Import Participants</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload CSV File
                  </label>
                  <input
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
                <div className="text-sm text-gray-500">
                  <p className="font-medium mb-2">CSV Format Requirements:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Required Columns:</strong> Column 1, Full Name :, Age :, Qualification :, Gender :, Father's Name :, Email id :, Phone :</li>
                    <li><strong>Note:</strong> Column names must include colons (:) exactly as shown</li>
                    <li>First row should contain headers</li>
                    <li>Gender values: male, female, or other</li>
                    <li>File should be in CSV format (.csv)</li>
                  </ul>
                  <div className="mt-3">
                    <a 
                      href="/sample_participants_template.csv" 
                      download="sample_participants_template.csv"
                      className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download Sample Template
                    </a>
                  </div>
                </div>
                <button
                  onClick={handleImportFromCSV}
                  disabled={!selectedFile}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import CSV
                </button>
              </div>
            </div>

            {/* Competition Settings */}
            {settings && (
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900">Competition Settings</h3>
                  <div className="text-sm text-gray-500">
                    Last updated: {new Date().toLocaleDateString()}
                  </div>
                </div>

                {/* Basic Competition Information */}
                <div className="mb-8">
                  <h4 className="text-md font-medium text-gray-800 mb-4 pb-2 border-b border-gray-200">
                    Competition Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Competition Name *
                      </label>
                      <input
                        type="text"
                        value={settings.competition_name?.value || ''}
                        onChange={(e) => setSettings(prev => prev ? {
                          ...prev,
                          competition_name: { ...prev.competition_name, value: e.target.value }
                        } : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter competition name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Competition Date *
                      </label>
                      <input
                        type="date"
                        value={settings.competition_date?.value || ''}
                        onChange={(e) => setSettings(prev => prev ? {
                          ...prev,
                          competition_date: { ...prev.competition_date, value: e.target.value }
                        } : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Registration Deadline *
                      </label>
                      <input
                        type="date"
                        value={settings.registration_deadline?.value || ''}
                        onChange={(e) => setSettings(prev => prev ? {
                          ...prev,
                          registration_deadline: { ...prev.registration_deadline, value: e.target.value }
                        } : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Maximum Participants *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={settings.max_participants?.value || ''}
                        onChange={(e) => setSettings(prev => prev ? {
                          ...prev,
                          max_participants: { ...prev.max_participants, value: e.target.value }
                        } : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter maximum participants"
                      />
                    </div>
                  </div>
                </div>

                {/* Evaluation Criteria */}
                <div className="mb-8">
                  <h4 className="text-md font-medium text-gray-800 mb-4 pb-2 border-b border-gray-200">
                    Evaluation Criteria (Maximum Marks)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Introduction *
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={settings.introduction_max?.value || settings.max_introduction_marks?.value || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          setSettings(prev => prev ? {
                            ...prev,
                            introduction_max: { ...prev.introduction_max, value },
                            max_introduction_marks: { ...prev.max_introduction_marks, value }
                          } : null);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Max marks for introduction"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Content *
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={settings.content_max?.value || settings.max_content_marks?.value || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          setSettings(prev => prev ? {
                            ...prev,
                            content_max: { ...prev.content_max, value },
                            max_content_marks: { ...prev.max_content_marks, value }
                          } : null);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Max marks for content"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Conclusion *
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={settings.conclusion_max?.value || settings.max_conclusion_marks?.value || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          setSettings(prev => prev ? {
                            ...prev,
                            conclusion_max: { ...prev.conclusion_max, value },
                            max_conclusion_marks: { ...prev.max_conclusion_marks, value }
                          } : null);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Max marks for conclusion"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Handwriting *
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={settings.handwriting_max?.value || settings.max_handwriting_marks?.value || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          setSettings(prev => prev ? {
                            ...prev,
                            handwriting_max: { ...prev.handwriting_max, value },
                            max_handwriting_marks: { ...prev.max_handwriting_marks, value }
                          } : null);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Max marks for handwriting"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Grammar & Spelling *
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={settings.grammar_max?.value || settings.max_grammar_marks?.value || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          setSettings(prev => prev ? {
                            ...prev,
                            grammar_max: { ...prev.grammar_max, value },
                            max_grammar_marks: { ...prev.max_grammar_marks, value }
                          } : null);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Max marks for grammar"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Special Points *
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={settings.special_points_max?.value || settings.max_special_points?.value || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          setSettings(prev => prev ? {
                            ...prev,
                            special_points_max: { ...prev.special_points_max, value },
                            max_special_points: { ...prev.max_special_points, value }
                          } : null);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Max special points"
                      />
                    </div>
                  </div>
                </div>

                {/* Total Marks Summary */}
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-md font-medium text-blue-800 mb-2">Total Maximum Marks</h4>
                  <div className="text-2xl font-bold text-blue-900">
                    {(() => {
                      const intro = parseInt(settings.introduction_max?.value || settings.max_introduction_marks?.value || '0');
                      const content = parseInt(settings.content_max?.value || settings.max_content_marks?.value || '0');
                      const conclusion = parseInt(settings.conclusion_max?.value || settings.max_conclusion_marks?.value || '0');
                      const handwriting = parseInt(settings.handwriting_max?.value || settings.max_handwriting_marks?.value || '0');
                      const grammar = parseInt(settings.grammar_max?.value || settings.max_grammar_marks?.value || '0');
                      const special = parseInt(settings.special_points_max?.value || settings.max_special_points?.value || '0');
                      return intro + content + conclusion + handwriting + grammar + special;
                    })()} Points
                  </div>
                  <p className="text-sm text-blue-700 mt-1">
                    This is the maximum total score a participant can achieve
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-500">
                    * Required fields
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        // Reset to default values
                        if (settings) {
                          setSettings({
                            ...settings,
                            competition_name: { ...settings.competition_name, value: '' },
                            competition_date: { ...settings.competition_date, value: '' },
                            registration_deadline: { ...settings.registration_deadline, value: '' },
                            max_participants: { ...settings.max_participants, value: '100' },
                            introduction_max: { ...settings.introduction_max, value: '10' },
                            content_max: { ...settings.content_max, value: '40' },
                            conclusion_max: { ...settings.conclusion_max, value: '10' },
                            handwriting_max: { ...settings.handwriting_max, value: '10' },
                            grammar_max: { ...settings.grammar_max, value: '10' },
                            special_points_max: { ...settings.special_points_max, value: '10' }
                          });
                        }
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Reset to Defaults
                    </button>
                    <button
                      onClick={handleUpdateSettings}
                      className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Settings
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Add User Button */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">User Management</h3>
              <button
                onClick={() => setIsCreatingUser(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </button>
            </div>

            {/* User Form Modal */}
            {(isCreatingUser || editingUser) && (
              <div className="bg-white shadow rounded-lg p-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">
                  {editingUser ? 'Edit User' : 'Add New User'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      value={userForm.username}
                      onChange={(e) => setUserForm(prev => ({ ...prev, username: e.target.value }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      value={userForm.password}
                      onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder={editingUser ? "Leave blank to keep current" : "Enter password"}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <select
                      value={userForm.role}
                      onChange={(e) => setUserForm(prev => ({ ...prev, role: e.target.value }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="invigilator">Invigilator</option>
                      <option value="evaluator">Evaluator</option>
                      <option value="registration_desk">Registration Desk</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4 flex justify-end space-x-3">
                  <button
                    onClick={cancelEdit}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editingUser ? handleUpdateUser : handleCreateUser}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                  >
                    {editingUser ? 'Update User' : 'Create User'}
                  </button>
                </div>
              </div>
            )}

            {/* Users List */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h4 className="text-lg font-medium text-gray-900">All Users</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Username
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Full Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {user.username}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.full_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.email || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                            {getRoleDisplayName(user.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.date_joined).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => startEditUser(user)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Danger Zone Tab */}
        {activeTab === 'danger' && (
          <div className="space-y-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
                <h3 className="text-lg font-medium text-red-900">Danger Zone</h3>
              </div>
              <p className="text-red-700 mb-4">
                The actions in this section are irreversible and will permanently delete data from the system.
                Please proceed with extreme caution.
              </p>
              
              <div className="bg-white border border-red-300 rounded-lg p-4">
                <h4 className="text-md font-medium text-red-900 mb-2">Clear All Data</h4>
                <p className="text-red-700 mb-4">
                  This will permanently delete all participants, evaluations, and non-admin users from the system.
                  This action cannot be undone.
                </p>
                <div className="bg-red-100 border border-red-300 rounded p-3 mb-4">
                  <p className="text-sm text-red-800 font-medium mb-1">What will be deleted:</p>
                  <ul className="text-sm text-red-700 list-disc list-inside">
                    <li>All participant records and registration data</li>
                    <li>All evaluation scores and feedback</li>
                    <li>All non-admin user accounts (invigilators, evaluators, registration desk)</li>
                    <li>Registration number sequences (will reset to REG250001)</li>
                  </ul>
                  <p className="text-sm text-red-800 font-medium mt-2 mb-1">What will be preserved:</p>
                  <ul className="text-sm text-red-700 list-disc list-inside">
                    <li>Admin user accounts</li>
                    <li>Competition settings and configuration</li>
                  </ul>
                </div>
                <button
                  onClick={() => setShowClearDataModal(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
                >
                  Clear All Data
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Clear All Data Modal */}
        {showClearDataModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
                <h3 className="text-lg font-medium text-red-900">
                  {clearDataStep === 1 ? 'Confirm Clear All Data' : 'Final Confirmation'}
                </h3>
              </div>
              
              {clearDataStep === 1 ? (
                <div>
                  <p className="text-red-700 mb-4">
                    Are you absolutely sure you want to clear all data? This action will permanently delete:
                  </p>
                  <ul className="text-sm text-red-700 list-disc list-inside mb-4">
                    <li>All participants and their registration data</li>
                    <li>All evaluation scores and feedback</li>
                    <li>All non-admin user accounts</li>
                    <li>Registration number sequences</li>
                  </ul>
                  <p className="text-red-800 font-medium mb-4">
                    This action cannot be undone!
                  </p>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={resetClearDataModal}
                      className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleClearAllData}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Yes, I'm Sure
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-red-700 mb-4">
                    To proceed with clearing all data, please type the exact confirmation code:
                  </p>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirmation Code:
                    </label>
                    <input
                      type="text"
                      value={clearDataConfirmCode}
                      onChange={(e) => setClearDataConfirmCode(e.target.value)}
                      placeholder="CLEAR_ALL_DATA_CONFIRM"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={resetClearDataModal}
                      className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleClearAllData}
                      disabled={isClearingData || clearDataConfirmCode !== 'CLEAR_ALL_DATA_CONFIRM'}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      {isClearingData ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Clearing...
                        </>
                      ) : (
                        'Clear All Data'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}