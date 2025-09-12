'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Save, Upload, Download, Settings as SettingsIcon } from 'lucide-react';
import { adminAPI } from '@/lib/api';
import toast from 'react-hot-toast';

interface CompetitionSettings {
  competition_name: string;
  competition_date: string;
  registration_deadline: string;
  max_participants: number;
  evaluation_criteria: {
    introduction_max: number;
    content_max: number;
    conclusion_max: number;
    handwriting_max: number;
    grammar_max: number;
    special_points_max: number;
  };
}

export default function Settings() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState<CompetitionSettings>({
    competition_name: '',
    competition_date: '',
    registration_deadline: '',
    max_participants: 100,
    evaluation_criteria: {
      introduction_max: 10,
      content_max: 40,
      conclusion_max: 10,
      handwriting_max: 10,
      grammar_max: 10,
      special_points_max: 10
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/login');
    } else if (user && user.role === 'admin') {
      fetchSettings();
    }
  }, [user, router]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getSettings();
      const settingsData = response.data?.settings || {};
      
      // Parse the settings from the backend format
      const parsedSettings = {
        competition_name: settingsData.competition_name?.value || '',
        competition_date: settingsData.competition_date?.value || '',
        registration_deadline: settingsData.registration_deadline?.value || '',
        max_participants: parseInt(settingsData.max_participants?.value) || 100,
        evaluation_criteria: {
          introduction_max: parseInt(settingsData.introduction_max?.value) || 10,
          content_max: parseInt(settingsData.content_max?.value) || 40,
          conclusion_max: parseInt(settingsData.conclusion_max?.value) || 10,
          handwriting_max: parseInt(settingsData.handwriting_max?.value) || 10,
          grammar_max: parseInt(settingsData.grammar_max?.value) || 10,
          special_points_max: parseInt(settingsData.special_points_max?.value) || 10
        }
      };
      
      setSettings(parsedSettings);
    } catch (error: any) {
      toast.error('Failed to load settings');
      console.error('Error fetching settings:', error);
      // Keep default settings if API fails
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      
      // Convert settings to the format expected by the backend
      const settingsToSave = {
        competition_name: settings.competition_name,
        competition_date: settings.competition_date,
        registration_deadline: settings.registration_deadline,
        max_participants: settings.max_participants.toString(),
        introduction_max: settings.evaluation_criteria.introduction_max.toString(),
        content_max: settings.evaluation_criteria.content_max.toString(),
        conclusion_max: settings.evaluation_criteria.conclusion_max.toString(),
        handwriting_max: settings.evaluation_criteria.handwriting_max.toString(),
        grammar_max: settings.evaluation_criteria.grammar_max.toString(),
        special_points_max: settings.evaluation_criteria.special_points_max.toString()
      };
      
      await adminAPI.updateSettings(settingsToSave);
      toast.success('Settings saved successfully');
    } catch (error: any) {
      toast.error('Failed to save settings');
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setCsvFile(file);
      } else {
        toast.error('Please select a CSV file');
        event.target.value = '';
      }
    }
  };

  const handleImportFromCSV = async () => {
    if (!csvFile) {
      toast.error('Please select a CSV file');
      return;
    }

    try {
      setSaving(true);
      const response = await adminAPI.importFromCSV(csvFile);
      const { results } = response.data;
      
      // Show detailed import results
      toast.success(
        `Import completed! Total: ${results.total}, Created: ${results.created}, Skipped: ${results.skipped}`,
        { duration: 5000 }
      );
      
      // Show errors if any
      if (results.errors && results.errors.length > 0) {
        console.warn('Import errors:', results.errors);
        toast.error(`${results.errors.length} participants had errors during import`);
      }
      
      setCsvFile(null);
      // Reset file input
      const fileInput = document.getElementById('csvFile') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to import CSV file';
      toast.error(errorMessage);
      console.error('Error importing CSV:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleExportParticipants = async () => {
    try {
      const response = await adminAPI.exportParticipants();
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `participants_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Participants exported successfully');
    } catch (error: any) {
      toast.error('Failed to export participants');
      console.error('Error exporting participants:', error);
    }
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
            <div className="flex items-center">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-600">Configure competition settings</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Competition Settings */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center">
                <SettingsIcon className="w-5 h-5 mr-2" />
                Competition Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Competition Name
                  </label>
                  <input
                    type="text"
                    value={settings.competition_name}
                    onChange={(e) => setSettings({...settings, competition_name: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Competition Date
                  </label>
                  <input
                    type="date"
                    value={settings.competition_date}
                    onChange={(e) => setSettings({...settings, competition_date: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Registration Deadline
                  </label>
                  <input
                    type="date"
                    value={settings.registration_deadline}
                    onChange={(e) => setSettings({...settings, registration_deadline: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Participants
                  </label>
                  <input
                    type="number"
                    value={settings.max_participants}
                    onChange={(e) => setSettings({...settings, max_participants: parseInt(e.target.value)})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Evaluation Criteria */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Evaluation Criteria (Maximum Points)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Introduction
                  </label>
                  <input
                    type="number"
                    value={settings.evaluation_criteria?.introduction_max || 10}
                    onChange={(e) => setSettings({
                      ...settings,
                      evaluation_criteria: {
                        ...settings.evaluation_criteria,
                        introduction_max: parseInt(e.target.value)
                      }
                    })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content
                  </label>
                  <input
                    type="number"
                    value={settings.evaluation_criteria?.content_max || 40}
                    onChange={(e) => setSettings({
                      ...settings,
                      evaluation_criteria: {
                        ...settings.evaluation_criteria,
                        content_max: parseInt(e.target.value)
                      }
                    })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Conclusion
                  </label>
                  <input
                    type="number"
                    value={settings.evaluation_criteria?.conclusion_max || 10}
                    onChange={(e) => setSettings({
                      ...settings,
                      evaluation_criteria: {
                        ...settings.evaluation_criteria,
                        conclusion_max: parseInt(e.target.value)
                      }
                    })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Handwriting
                  </label>
                  <input
                    type="number"
                    value={settings.evaluation_criteria?.handwriting_max || 10}
                    onChange={(e) => setSettings({
                      ...settings,
                      evaluation_criteria: {
                        ...settings.evaluation_criteria,
                        handwriting_max: parseInt(e.target.value)
                      }
                    })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grammar & Spelling
                  </label>
                  <input
                    type="number"
                    value={settings.evaluation_criteria?.grammar_max || 10}
                    onChange={(e) => setSettings({
                      ...settings,
                      evaluation_criteria: {
                        ...settings.evaluation_criteria,
                        grammar_max: parseInt(e.target.value)
                      }
                    })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Special Points
                  </label>
                  <input
                    type="number"
                    value={settings.evaluation_criteria?.special_points_max || 10}
                    onChange={(e) => setSettings({
                      ...settings,
                      evaluation_criteria: {
                        ...settings.evaluation_criteria,
                        special_points_max: parseInt(e.target.value)
                      }
                    })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Data Management */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Data Management
              </h3>
              <div className="space-y-6">
                {/* CSV Import */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Import Participants from CSV File
                  </label>
                  <div className="flex space-x-3">
                    <input
                      id="csvFile"
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      onClick={handleImportFromCSV}
                      disabled={saving || !csvFile}
                      className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {saving ? 'Importing...' : 'Import'}
                    </button>
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    <p>Select a CSV file to import participant data</p>
                    {csvFile && (
                      <p className="text-green-600 font-medium">
                        Selected: {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                    <div className="mt-2 p-3 bg-blue-50 rounded-md">
                      <p className="font-medium text-blue-800 mb-1">Required columns in your CSV file:</p>
                      <p className="text-blue-700 text-xs">
                        Column 1, Full Name :, Age :, Qualification :, Gender :, Father's Name :, Email id :, Phone :
                      </p>
                      <p className="text-blue-600 text-xs mt-1">
                        Note: Duplicate participants (by email, name+age, or phone) will be skipped
                      </p>
                    </div>
                  </div>
                </div>

                {/* Export Participants */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Export Participants
                  </label>
                  <button
                    onClick={handleExportParticipants}
                    className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </button>
                  <p className="mt-2 text-sm text-gray-500">
                    Download all participant data as a CSV file
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              <Save className="w-5 h-5 mr-2" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
