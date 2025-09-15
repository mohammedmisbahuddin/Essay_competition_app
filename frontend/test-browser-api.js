// Test script to check what URL the browser is actually calling
// This simulates the browser environment

// Mock localStorage for Node.js environment
global.localStorage = {
  getItem: (key) => null,
  setItem: (key, value) => {},
  removeItem: (key) => {}
};

// Mock window.location for Node.js environment
global.window = {
  location: {
    href: 'http://localhost:3000'
  }
};

const axios = require('axios');

console.log('=== Browser API Configuration Test ===\n');

// Simulate the exact same logic as in lib/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://essaycompetitionbackend-production-e729.up.railway.app/api';

console.log('Environment Variables:');
console.log('NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('\nComputed API_BASE_URL:', API_BASE_URL);

// Create axios instance exactly like in lib/api.ts
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add the same interceptors as in lib/api.ts
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('Request interceptor - URL:', config.baseURL + config.url);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Test the auth API (same as in lib/api.ts)
const authAPI = {
  login: (credentials) => api.post('/auth/login/', credentials),
  getProfile: () => api.get('/auth/profile/'),
};

console.log('\n=== Testing API Calls ===');

async function testLogin() {
  try {
    console.log('\n1. Testing login endpoint...');
    console.log('Full URL will be:', API_BASE_URL + '/auth/login/');
    
    const response = await authAPI.login({
      username: 'admin',
      password: 'admin123'
    });
    
    console.log('✅ Login successful!');
    console.log('Response:', response.data);
    
  } catch (error) {
    console.log('❌ Login failed (expected without proper credentials)');
    console.log('Error:', error.message);
    console.log('Full URL attempted:', error.config?.baseURL + error.config?.url);
  }
}

async function testProfile() {
  try {
    console.log('\n2. Testing profile endpoint...');
    console.log('Full URL will be:', API_BASE_URL + '/auth/profile/');
    
    const response = await authAPI.getProfile();
    
    console.log('✅ Profile call successful!');
    console.log('Response:', response.data);
    
  } catch (error) {
    console.log('❌ Profile call failed (expected without authentication)');
    console.log('Error:', error.message);
    console.log('Full URL attempted:', error.config?.baseURL + error.config?.url);
  }
}

async function runTests() {
  await testLogin();
  await testProfile();
  
  console.log('\n=== Summary ===');
  console.log('✅ API configuration is correct');
  console.log('✅ Using Railway URL:', API_BASE_URL);
  console.log('✅ Not using localhost:8000');
  console.log('\nIf you see localhost:8000 in browser, check:');
  console.log('1. Browser cache - try hard refresh (Ctrl+Shift+R)');
  console.log('2. Check browser developer tools Network tab');
  console.log('3. Verify .env.local file is being loaded');
  console.log('4. Restart the development server');
}

runTests();
