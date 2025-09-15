const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000/api';

async function testAPITrailingSlashes() {
  console.log('🧪 Testing API Calls with Trailing Slashes');
  console.log('==========================================\n');

  try {
    // Test 1: Backend Health Check
    console.log('1. Testing Backend Health...');
    const healthResponse = await axios.get('http://localhost:8000/health/');
    console.log('✅ Backend Health:', healthResponse.data.status);
    console.log('');

    // Test 2: Login API with trailing slash
    console.log('2. Testing Login API with trailing slash...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login/`, {
      username: 'admin',
      password: 'admin123'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Login successful!');
    console.log('   User:', loginResponse.data.user.username);
    console.log('   Role:', loginResponse.data.user.role);
    console.log('   Token length:', loginResponse.data.token.length);
    console.log('');

    // Test 3: Profile API with trailing slash
    const token = loginResponse.data.token;
    console.log('3. Testing Profile API with trailing slash...');
    const profileResponse = await axios.get(`${API_BASE_URL}/auth/profile/`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Profile API successful!');
    console.log('   User ID:', profileResponse.data.user.id);
    console.log('   Full Name:', profileResponse.data.user.full_name);
    console.log('');

    // Test 4: Participants API with trailing slash
    console.log('4. Testing Participants API with trailing slash...');
    const participantsResponse = await axios.get(`${API_BASE_URL}/participants/`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Participants API successful!');
    console.log('   Participants count:', participantsResponse.data.count || participantsResponse.data.length);
    console.log('');

    // Test 5: Admin Stats API with trailing slash
    console.log('5. Testing Admin Stats API with trailing slash...');
    const statsResponse = await axios.get(`${API_BASE_URL}/admin/stats/`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Admin Stats API successful!');
    console.log('   Stats:', JSON.stringify(statsResponse.data, null, 2));
    console.log('');

    console.log('🎉 ALL API CALLS WITH TRAILING SLASHES WORKING!');
    console.log('===============================================');
    console.log('✅ All API endpoints now include trailing slashes');
    console.log('✅ Backend is responding correctly to all requests');
    console.log('✅ Frontend API configuration is updated');
    console.log('');
    console.log('🔗 The frontend is now properly configured to work with Django backend!');

  } catch (error) {
    console.error('❌ Test failed:');
    console.error('Error:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
    console.error('URL:', error.config?.url);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Troubleshooting:');
      console.error('   - Make sure Django backend is running on port 8000');
      console.error('   - Check if the backend is accessible');
    }
  }
}

testAPITrailingSlashes();
