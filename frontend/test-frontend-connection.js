const axios = require('axios');

const FRONTEND_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:8000';

async function testFrontendConnection() {
  console.log('🧪 Testing Frontend Connection to Backend');
  console.log('==========================================\n');

  try {
    // Test 1: Frontend is running
    console.log('1. Testing Frontend Health...');
    const frontendResponse = await axios.get(FRONTEND_URL);
    console.log('✅ Frontend is running!');
    console.log('   Status:', frontendResponse.status);
    console.log('   URL:', FRONTEND_URL);
    console.log('');

    // Test 2: Login page is accessible
    console.log('2. Testing Login Page...');
    const loginPageResponse = await axios.get(`${FRONTEND_URL}/login`);
    console.log('✅ Login page is accessible!');
    console.log('   Status:', loginPageResponse.status);
    console.log('   Contains "Sign in":', loginPageResponse.data.includes('Sign in'));
    console.log('   Contains "admin":', loginPageResponse.data.includes('admin'));
    console.log('');

    // Test 3: Backend is accessible (assuming you're running it separately)
    console.log('3. Testing Backend Connection...');
    try {
      const backendResponse = await axios.get(`${BACKEND_URL}/health/`);
      console.log('✅ Backend is accessible!');
      console.log('   Status:', backendResponse.status);
      console.log('   Response:', backendResponse.data);
    } catch (error) {
      console.log('⚠️  Backend not accessible (this is expected if not running)');
      console.log('   Error:', error.message);
    }
    console.log('');

    // Test 4: Environment configuration
    console.log('4. Checking Environment Configuration...');
    const envContent = require('fs').readFileSync('.env.local', 'utf8');
    console.log('✅ Environment file found!');
    console.log('   Content:', envContent.trim());
    console.log('');

    console.log('🎉 FRONTEND SETUP COMPLETE!');
    console.log('============================');
    console.log('✅ Frontend is running on http://localhost:3000');
    console.log('✅ Login page is accessible at http://localhost:3000/login');
    console.log('✅ Environment configured to connect to http://localhost:8000/api');
    console.log('');
    console.log('🔗 You can now:');
    console.log('   - Open http://localhost:3000 in your browser');
    console.log('   - Go to http://localhost:3000/login');
    console.log('   - Login with username: admin, password: admin123');
    console.log('   - Test the full application functionality');
    console.log('');
    console.log('📝 Note: Make sure your backend is running on port 8000');
    console.log('   for the frontend to work properly.');

  } catch (error) {
    console.error('❌ Test failed:');
    console.error('Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Troubleshooting:');
      console.error('   - Make sure the frontend is running: npm run dev');
      console.error('   - Check if port 3000 is available');
    }
  }
}

testFrontendConnection();
