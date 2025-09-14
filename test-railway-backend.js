#!/usr/bin/env node

const axios = require('axios');

const BACKEND_URL = 'https://essaycompetitionbackend-production.up.railway.app';

async function testRailwayBackend() {
  console.log('🚀 Testing Railway Backend Deployment...');
  console.log('Backend URL:', BACKEND_URL);
  console.log('=' .repeat(50));

  const tests = [
    { name: 'Health Check', url: '/health', method: 'GET' },
    { name: 'Admin Login', url: '/api/auth/login', method: 'POST', data: { username: 'admin', password: 'admin123' } },
    { name: 'Admin Stats', url: '/api/admin/stats', method: 'GET', auth: true }
  ];

  let authToken = null;

  for (const test of tests) {
    try {
      console.log(`\n🧪 Testing ${test.name}...`);
      
      const config = {
        method: test.method,
        url: `${BACKEND_URL}${test.url}`,
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
        ...(test.data && { data: test.data }),
        ...(test.auth && authToken && { headers: { ...config.headers, 'Authorization': `Bearer ${authToken}` } })
      };
      
      const response = await axios(config);
      
      if (response.status === 200 || response.status === 201) {
        console.log(`✅ ${test.name} working`);
        console.log(`   Status: ${response.status}`);
        
        // Store auth token for subsequent requests
        if (test.name === 'Admin Login' && response.data.token) {
          authToken = response.data.token;
          console.log(`   Token received: ${authToken.substring(0, 20)}...`);
        }
      } else {
        console.log(`❌ ${test.name} failed (${response.status})`);
      }
      
    } catch (error) {
      console.log(`❌ ${test.name} failed:`);
      console.log(`   Error: ${error.response?.data?.error || error.message}`);
      if (error.code === 'ECONNREFUSED') {
        console.log(`   Connection refused - service might not be running`);
      } else if (error.code === 'ENOTFOUND') {
        console.log(`   Host not found - check URL`);
      } else if (error.code === 'ETIMEDOUT') {
        console.log(`   Request timeout - service might be starting`);
      }
    }
  }

  console.log('\n' + '=' .repeat(50));
  console.log('🎯 Backend test completed!');
}

// Run test
if (require.main === module) {
  testRailwayBackend().catch(console.error);
}

module.exports = { testRailwayBackend };
