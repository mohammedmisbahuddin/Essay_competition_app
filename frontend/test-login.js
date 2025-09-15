const axios = require('axios');

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://web-production-6ef8.up.railway.app/api';

async function testLogin() {
  try {
    console.log('Testing login API...');
    console.log('API URL:', API_BASE_URL);
    
    const response = await axios.post(`${API_BASE_URL}/auth/login/`, {
      username: 'admin',
      password: 'admin123'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Login successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    // Test profile API with token
    const token = response.data.token;
    const profileResponse = await axios.get(`${API_BASE_URL}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Profile API successful!');
    console.log('Profile:', JSON.stringify(profileResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Login failed:');
    console.error('Error:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
    console.error('URL:', error.config?.url);
  }
}

testLogin();
