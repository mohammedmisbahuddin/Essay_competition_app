const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Test configuration
const BASE_URL = 'http://localhost:5001/api';
let authToken = '';
let adminToken = '';
let evaluatorToken = '';
let participantId = '';
let evaluationId = '';

// Test data
const testAdmin = {
  username: 'admin',
  password: 'admin123'
};

const testEvaluator = {
  username: 'evaluator',
  password: 'evaluator123'
};

const testParticipant = {
  full_name: 'Test Participant',
  email: 'test@example.com',
  phone: '1234567890',
  gender: 'male',
  age: 25,
  qualification: 'Bachelor',
  father_name: 'Test Father'
};

const testEvaluation = {
  participant_id: 1,
  introduction_marks: 8,
  content_marks: 15,
  conclusion_marks: 7,
  handwriting_marks: 8,
  grammar_marks: 9,
  special_points: 5,
  comments: 'Good essay overall'
};

// Helper functions
const makeRequest = async (method, endpoint, data = null, token = null) => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      ...(data && { data })
    };

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message, 
      status: error.response?.status || 500 
    };
  }
};

const createTestCSV = () => {
  const csvContent = `full_name,email,phone,gender,age,qualification,father_name
John Doe,john@example.com,1234567890,male,25,Bachelor,John Senior
Jane Smith,jane@example.com,0987654321,female,23,Master,Jane Senior
Bob Wilson,bob@example.com,1122334455,male,28,PhD,Bob Senior`;
  
  const csvPath = path.join(__dirname, 'test_participants.csv');
  fs.writeFileSync(csvPath, csvContent);
  return csvPath;
};

const cleanupTestFiles = () => {
  const csvPath = path.join(__dirname, 'test_participants.csv');
  if (fs.existsSync(csvPath)) {
    fs.unlinkSync(csvPath);
  }
};

// Test cases
const tests = {
  // Health check
  healthCheck: async () => {
    console.log('\n🏥 Testing Health Check...');
    try {
      const response = await axios.get('http://localhost:5001/health');
      console.log('✅ Health check passed');
      return { success: true, data: response.data };
    } catch (error) {
      console.log('❌ Health check failed');
      return { success: false, error: error.message };
    }
  },

  // Authentication tests
  login: async () => {
    console.log('\n🔐 Testing Login...');
    const result = await makeRequest('POST', '/auth/login', testAdmin);
    if (result.success) {
      adminToken = result.data.token;
      console.log('✅ Admin login successful');
    } else {
      console.log('❌ Admin login failed:', result.error);
    }
    return result;
  },

  loginEvaluator: async () => {
    console.log('\n🔐 Testing Evaluator Login...');
    const result = await makeRequest('POST', '/auth/login', testEvaluator);
    if (result.success) {
      evaluatorToken = result.data.token;
      console.log('✅ Evaluator login successful');
    } else {
      console.log('❌ Evaluator login failed:', result.error);
    }
    return result;
  },

  getProfile: async () => {
    console.log('\n👤 Testing Get Profile...');
    const result = await makeRequest('GET', '/auth/profile', null, adminToken);
    console.log(result.success ? '✅ Get profile successful' : '❌ Get profile failed');
    return result;
  },

  // Admin routes tests
  getDashboard: async () => {
    console.log('\n📊 Testing Admin Dashboard...');
    const result = await makeRequest('GET', '/admin/dashboard', null, adminToken);
    console.log(result.success ? '✅ Dashboard data retrieved' : '❌ Dashboard failed');
    return result;
  },

  getStats: async () => {
    console.log('\n📊 Testing Admin Stats...');
    const result = await makeRequest('GET', '/admin/stats', null, adminToken);
    console.log(result.success ? '✅ Stats data retrieved' : '❌ Stats failed');
    return result;
  },

  // Participant routes tests
  createParticipant: async () => {
    console.log('\n👥 Testing Create Participant...');
    const result = await makeRequest('POST', '/participants', testParticipant, adminToken);
    if (result.success && result.data.participant) {
      participantId = result.data.participant.id;
      console.log('✅ Participant created successfully');
    } else {
      console.log('❌ Create participant failed:', result.error);
    }
    return result;
  },

  getParticipants: async () => {
    console.log('\n👥 Testing Get Participants...');
    const result = await makeRequest('GET', '/participants', null, adminToken);
    console.log(result.success ? '✅ Participants retrieved' : '❌ Get participants failed');
    return result;
  },

  searchParticipants: async () => {
    console.log('\n🔍 Testing Search Participants...');
    const result = await makeRequest('GET', '/participants/search?q=Test', null, adminToken);
    console.log(result.success ? '✅ Search participants successful' : '❌ Search participants failed');
    return result;
  },

  validateParticipant: async () => {
    console.log('\n✅ Testing Validate Participant...');
    const result = await makeRequest('GET', '/participants/validate/REG250001', null, adminToken);
    console.log(result.success ? '✅ Validate participant successful' : '❌ Validate participant failed');
    return result;
  },

  // CSV Import test
  csvImport: async () => {
    console.log('\n📁 Testing CSV Import...');
    const csvPath = createTestCSV();
    
    try {
      const formData = new FormData();
      formData.append('csvFile', fs.createReadStream(csvPath), {
        filename: 'test_participants.csv',
        contentType: 'text/csv'
      });

      const response = await axios.post(`${BASE_URL}/admin/import/csv`, formData, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          ...formData.getHeaders()
        }
      });

      console.log('✅ CSV import successful');
      console.log('Import results:', response.data.results);
      return { success: true, data: response.data };
    } catch (error) {
      console.log('❌ CSV import failed:', error.response?.data || error.message);
      return { success: false, error: error.response?.data || error.message };
    } finally {
      cleanupTestFiles();
    }
  },

  // Evaluation routes tests
  getEvaluationForm: async () => {
    console.log('\n📝 Testing Get Evaluation Form...');
    // Use a valid registration number from our test data
    const result = await makeRequest('GET', '/evaluations/participant/REG250200', null, evaluatorToken);
    console.log(result.success ? '✅ Evaluation form retrieved' : '❌ Get evaluation form failed');
    return result;
  },

  createEvaluation: async () => {
    console.log('\n📝 Testing Create Evaluation...');
    // Get a valid participant ID first
    const participantsResult = await makeRequest('GET', '/participants?limit=1', null, adminToken);
    if (participantsResult.success && participantsResult.data.participants.length > 0) {
      const participantId = participantsResult.data.participants[0].id;
      const evaluationData = { ...testEvaluation, participant_id: participantId };
      const result = await makeRequest('POST', '/evaluations', evaluationData, evaluatorToken);
      if (result.success) {
        evaluationId = result.data.evaluation.id;
        console.log('✅ Evaluation created successfully');
      } else {
        console.log('❌ Create evaluation failed:', result.error);
      }
      return result;
    } else {
      console.log('❌ No participants found for evaluation test');
      return { success: false, error: 'No participants found' };
    }
  },

  getMyEvaluations: async () => {
    console.log('\n📝 Testing Get My Evaluations...');
    const result = await makeRequest('GET', '/evaluations/my-evaluations', null, evaluatorToken);
    console.log(result.success ? '✅ My evaluations retrieved' : '❌ Get my evaluations failed');
    return result;
  },

  submitEvaluation: async () => {
    console.log('\n📝 Testing Submit Evaluation...');
    // Get a valid participant ID first
    const participantsResult = await makeRequest('GET', '/participants?limit=1', null, adminToken);
    if (participantsResult.success && participantsResult.data.participants.length > 0) {
      const participantId = participantsResult.data.participants[0].id;
      const evaluationData = { ...testEvaluation, participant_id: participantId };
      const result = await makeRequest('POST', '/evaluations', evaluationData, evaluatorToken);
      console.log(result.success ? '✅ Evaluation submitted successfully' : '❌ Submit evaluation failed');
      return result;
    } else {
      console.log('❌ No participants found for evaluation test');
      return { success: false, error: 'No participants found' };
    }
  },

  // Test clear all data functionality
  testClearAllData: async () => {
    console.log('\n🗑️ Testing Clear All Data...');
    
    // Test without confirmation code
    const result1 = await makeRequest('DELETE', '/admin/clear-all-data', { confirmCode: 'WRONG_CODE' }, adminToken);
    if (result1.status === 400) {
      console.log('✅ Clear all data requires correct confirmation code');
    } else {
      console.log('❌ Clear all data should require confirmation code');
    }
    
    // Test with correct confirmation code (but don't actually clear data in test)
    const result2 = await makeRequest('DELETE', '/admin/clear-all-data', { confirmCode: 'CLEAR_ALL_DATA_CONFIRM' }, adminToken);
    if (result2.success) {
      console.log('✅ Clear all data endpoint working (data cleared)');
    } else {
      console.log('❌ Clear all data failed:', result2.error);
    }
    
    return { success: result1.status === 400 && result2.success };
  },

  // Test missing admin routes
  testMissingRoutes: async () => {
    console.log('\n❌ Testing Missing Admin Routes...');
    
    const missingRoutes = [
      { method: 'GET', endpoint: '/admin/results', name: 'Get Results' },
      { method: 'GET', endpoint: '/admin/users', name: 'Get Users' },
      { method: 'POST', endpoint: '/admin/users', name: 'Create User' },
      { method: 'GET', endpoint: '/admin/settings', name: 'Get Settings' },
      { method: 'GET', endpoint: '/admin/export/results', name: 'Export Results' },
      { method: 'DELETE', endpoint: '/admin/clear-all-data', name: 'Clear All Data' }
    ];

    let allRoutesExist = true;
    for (const route of missingRoutes) {
      const result = await makeRequest(route.method, route.endpoint, null, adminToken);
      if (result.status === 404) {
        console.log(`❌ Missing route: ${route.name} (${route.method} ${route.endpoint})`);
        allRoutesExist = false;
      } else {
        console.log(`✅ Route exists: ${route.name} (${route.method} ${route.endpoint})`);
      }
    }
    
    return { success: allRoutesExist };
  }
};

// Main test runner
const runTests = async () => {
  console.log('🚀 Starting Route Validation Tests...\n');
  
  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };

  for (const [testName, testFn] of Object.entries(tests)) {
    try {
      results.total++;
      const result = await testFn();
      if (result.success) {
        results.passed++;
      } else {
        results.failed++;
      }
    } catch (error) {
      console.log(`❌ Test ${testName} threw error:`, error.message);
      results.failed++;
    }
  }

  console.log('\n📊 Test Results Summary:');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Total: ${results.total}`);
  console.log(`🎯 Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);

  if (results.failed > 0) {
    console.log('\n⚠️  Some tests failed. Check the output above for details.');
  } else {
    console.log('\n🎉 All tests passed!');
  }
};

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, tests };
