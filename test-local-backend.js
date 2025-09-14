#!/usr/bin/env node

const axios = require('axios');

const BACKEND_URL = 'http://localhost:5002';

async function testLocalBackend() {
  console.log('🚀 Testing Local Backend on Port 5002...');
  console.log('Backend URL:', BACKEND_URL);
  console.log('=' .repeat(50));

  const tests = [
    { name: 'Health Check', url: '/health', method: 'GET' },
    { name: 'Admin Login', url: '/api/auth/login', method: 'POST', data: { username: 'admin', password: 'admin123' } },
    { name: 'Admin Stats', url: '/api/admin/stats', method: 'GET', auth: true },
    { name: 'Admin Dashboard', url: '/api/admin/dashboard', method: 'GET', auth: true },
    { name: 'Get Participants', url: '/api/participants', method: 'GET', auth: true },
    { name: 'Create Participant', url: '/api/participants', method: 'POST', auth: true, data: { 
      full_name: 'Test User', 
      email: 'test@example.com', 
      phone: '1234567890', 
      gender: 'male', 
      age: 25, 
      qualification: 'Bachelor', 
      father_name: 'Test Father' 
    }}
  ];

  let authToken = null;
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`\n🧪 Testing ${test.name}...`);
      
      const headers = { 'Content-Type': 'application/json' };
      if (test.auth && authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      
      const config = {
        method: test.method,
        url: `${BACKEND_URL}${test.url}`,
        headers: headers,
        timeout: 5000,
        ...(test.data && { data: test.data })
      };
      
      const response = await axios(config);
      
      if (response.status === 200 || response.status === 201) {
        console.log(`✅ ${test.name} working`);
        console.log(`   Status: ${response.status}`);
        passed++;
        
        // Store auth token for subsequent requests
        if (test.name === 'Admin Login' && response.data.token) {
          authToken = response.data.token;
          console.log(`   Token received: ${authToken.substring(0, 20)}...`);
        }
        
        // Show response data for some tests
        if (test.name === 'Admin Stats') {
          console.log(`   Stats: ${JSON.stringify(response.data)}`);
        }
        
      } else {
        console.log(`❌ ${test.name} failed (${response.status})`);
        failed++;
      }
      
    } catch (error) {
      console.log(`❌ ${test.name} failed:`);
      console.log(`   Error: ${error.response?.data?.error || error.message}`);
      failed++;
    }
  }

  console.log('\n' + '=' .repeat(50));
  console.log(`🎯 Backend test completed!`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (passed === tests.length) {
    console.log('🎉 All tests passed! Backend is working perfectly!');
  } else {
    console.log('⚠️ Some tests failed. Check the errors above.');
  }
}

// Run test
if (require.main === module) {
  testLocalBackend().catch(console.error);
}

module.exports = { testLocalBackend };
