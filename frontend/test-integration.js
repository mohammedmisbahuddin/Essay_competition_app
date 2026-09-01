const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000/api';
const FRONTEND_URL = 'http://localhost:3000';

async function testIntegration() {
  console.log('🧪 Testing Frontend-Backend Integration');
  console.log('=====================================\n');

  try {
    // Test 1: Backend Health Check
    console.log('1. Testing Backend Health...');
    const healthResponse = await axios.get('http://localhost:8000/health/');
    console.log('✅ Backend Health:', healthResponse.data.status);
    console.log('   Timestamp:', healthResponse.data.timestamp);
    console.log('');

    // Test 2: Backend Login API
    console.log('2. Testing Backend Login API...');
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

    // Test 3: Backend Profile API
    const token = loginResponse.data.token;
    console.log('3. Testing Backend Profile API...');
    const profileResponse = await axios.get(`${API_BASE_URL}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Profile API successful!');
    console.log('   User ID:', profileResponse.data.user.id);
    console.log('   Full Name:', profileResponse.data.user.full_name);
    console.log('');

    // Test 4: Backend Participants API
    console.log('4. Testing Backend Participants API...');
    const participantsResponse = await axios.get(`${API_BASE_URL}/participants/`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Participants API successful!');
    console.log('   Participants count:', participantsResponse.data.count || participantsResponse.data.length);
    console.log('');

    // Test 5: Backend Admin Stats API
    console.log('5. Testing Backend Admin Stats API...');
    const statsResponse = await axios.get(`${API_BASE_URL}/admin/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Admin Stats API successful!');
    console.log('   Stats:', JSON.stringify(statsResponse.data, null, 2));
    console.log('');

    // Test 6: Frontend Health Check
    console.log('6. Testing Frontend Health...');
    const frontendResponse = await axios.get(FRONTEND_URL);
    console.log('✅ Frontend is running!');
    console.log('   Status:', frontendResponse.status);
    console.log('   Content-Type:', frontendResponse.headers['content-type']);
    console.log('');

    // Test 7: Frontend Login Page
    console.log('7. Testing Frontend Login Page...');
    const loginPageResponse = await axios.get(`${FRONTEND_URL}/login`);
    console.log('✅ Login page is accessible!');
    console.log('   Status:', loginPageResponse.status);
    console.log('   Contains "Sign in":', loginPageResponse.data.includes('Sign in'));
    console.log('   Contains "admin":', loginPageResponse.data.includes('admin'));
    console.log('');

    console.log('🎉 ALL TESTS PASSED!');
    console.log('===================');
    console.log('✅ Backend is running on http://localhost:8000');
    console.log('✅ Frontend is running on http://localhost:3000');
    console.log('✅ API endpoints are working correctly');
    console.log('✅ Authentication is working');
    console.log('✅ Frontend pages are loading');
    console.log('');
    console.log('🔗 You can now:');
    console.log('   - Open http://localhost:3000 in your browser');
    console.log('   - Go to http://localhost:3000/login');
    console.log('   - Login with username: admin, password: admin123');
    console.log('   - Test the full application functionality');

  } catch (error) {
    console.error('❌ Test failed:');
    console.error('Error:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
    console.error('URL:', error.config?.url);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Troubleshooting:');
      console.error('   - Make sure Django backend is running: python manage.py runserver 0.0.0.0:8000');
      console.error('   - Make sure Next.js frontend is running: npm run dev');
    }
  }
}

testIntegration();
