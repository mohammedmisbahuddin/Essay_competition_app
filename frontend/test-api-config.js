// Test script to check API configuration
const axios = require('axios');

// Test the API configuration
console.log('Testing API Configuration...\n');

// Check environment variables
console.log('Environment Variables:');
console.log('NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Test the API base URL (same logic as in lib/api.ts)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://essaycompetitionbackend-production-e729.up.railway.app/api';
console.log('\nComputed API_BASE_URL:', API_BASE_URL);

// Test a simple API call
async function testAPICall() {
  try {
    console.log('\nTesting API call to:', API_BASE_URL);
    
    // Test the health endpoint or any available endpoint
    const response = await axios.get(`${API_BASE_URL}/admin/stats/`, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('✅ API call successful!');
    console.log('Status:', response.status);
    console.log('Response data:', response.data);
    
  } catch (error) {
    console.log('❌ API call failed!');
    console.log('Error message:', error.message);
    
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    } else if (error.request) {
      console.log('Request was made but no response received');
      console.log('Request URL:', error.config?.url);
    } else {
      console.log('Error setting up request:', error.message);
    }
  }
}

// Test localhost:8000 as well
async function testLocalhost() {
  try {
    console.log('\nTesting localhost:8000...');
    
    const response = await axios.get('http://localhost:8000/api/admin/stats/', {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('✅ Localhost API call successful!');
    console.log('Status:', response.status);
    console.log('Response data:', response.data);
    
  } catch (error) {
    console.log('❌ Localhost API call failed!');
    console.log('Error message:', error.message);
  }
}

// Run tests
async function runTests() {
  await testAPICall();
  await testLocalhost();
}

runTests();
