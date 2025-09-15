const axios = require('axios');

const API_BASE_URL = 'http://localhost:5001/api';

async function testLocalLogin() {
  try {
    console.log('Testing local Django backend login...');
    console.log('API URL:', API_BASE_URL);
    
    // Test health endpoint
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await axios.get('http://localhost:5001/health/');
    console.log('✅ Health check:', healthResponse.data);
    
    // Test login API
    console.log('\n2. Testing login API...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login/`, {
      username: 'admin',
      password: 'admin123'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Login successful!');
    console.log('Response:', JSON.stringify(loginResponse.data, null, 2));
    
    // Test profile API with token
    const token = loginResponse.data.token;
    console.log('\n3. Testing profile API...');
    const profileResponse = await axios.get(`${API_BASE_URL}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Profile API successful!');
    console.log('Profile:', JSON.stringify(profileResponse.data, null, 2));
    
    // Test participants API
    console.log('\n4. Testing participants API...');
    const participantsResponse = await axios.get(`${API_BASE_URL}/participants/`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Participants API successful!');
    console.log('Participants count:', participantsResponse.data.count || participantsResponse.data.length);
    
  } catch (error) {
    console.error('❌ Test failed:');
    console.error('Error:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
    console.error('URL:', error.config?.url);
  }
}

testLocalLogin();
