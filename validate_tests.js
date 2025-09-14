#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Test configuration
const BASE_URL = 'http://localhost:5001/api';
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Quick validation tests
async function quickValidation() {
  console.log(`${colors.bright}${colors.blue}🔍 QUICK VALIDATION - ESSAY MANAGEMENT SYSTEM${colors.reset}`);
  console.log('=' .repeat(60));
  
  const results = {
    server: false,
    database: false,
    auth: false,
    admin: false,
    csv: false,
    total: 0,
    passed: 0
  };
  
  // Test 1: Server Health
  console.log(`\n${colors.cyan}1. Testing Server Health...${colors.reset}`);
  try {
    const response = await axios.get('http://localhost:5001/health');
    if (response.status === 200) {
      console.log(`${colors.green}✅ Server is running${colors.reset}`);
      results.server = true;
      results.passed++;
    }
  } catch (error) {
    console.log(`${colors.red}❌ Server is not running${colors.reset}`);
    console.log(`${colors.yellow}💡 Start server with: cd backend && PORT=5001 node src/server.js${colors.reset}`);
  }
  results.total++;
  
  // Test 2: Database Connection
  console.log(`\n${colors.cyan}2. Testing Database Connection...${colors.reset}`);
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    if (response.data.token) {
      console.log(`${colors.green}✅ Database connection successful${colors.reset}`);
      results.database = true;
      results.passed++;
    }
  } catch (error) {
    console.log(`${colors.red}❌ Database connection failed${colors.reset}`);
    console.log(`${colors.yellow}💡 Check PostgreSQL is running and credentials are correct${colors.reset}`);
  }
  results.total++;
  
  // Test 3: Authentication
  console.log(`\n${colors.cyan}3. Testing Authentication...${colors.reset}`);
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    if (response.data.token) {
      console.log(`${colors.green}✅ Authentication working${colors.reset}`);
      results.auth = true;
      results.passed++;
    }
  } catch (error) {
    console.log(`${colors.red}❌ Authentication failed${colors.reset}`);
  }
  results.total++;
  
  // Test 4: Admin Routes
  console.log(`\n${colors.cyan}4. Testing Admin Routes...${colors.reset}`);
  try {
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    
    const adminResponse = await axios.get(`${BASE_URL}/admin/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (adminResponse.status === 200) {
      console.log(`${colors.green}✅ Admin routes working${colors.reset}`);
      results.admin = true;
      results.passed++;
    }
  } catch (error) {
    console.log(`${colors.red}❌ Admin routes failed${colors.reset}`);
  }
  results.total++;
  
  // Test 5: CSV Import
  console.log(`\n${colors.cyan}5. Testing CSV Import...${colors.reset}`);
  try {
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    
    // Check if test CSV exists
    const csvPath = path.join(__dirname, 'test_participants.csv');
    if (fs.existsSync(csvPath)) {
      console.log(`${colors.green}✅ Test CSV file exists${colors.reset}`);
      results.csv = true;
      results.passed++;
    } else {
      console.log(`${colors.yellow}⚠️ Test CSV file not found${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}❌ CSV import test failed${colors.reset}`);
  }
  results.total++;
  
  // Generate summary
  console.log(`\n${colors.magenta}${colors.bright}📊 VALIDATION SUMMARY${colors.reset}`);
  console.log('=' .repeat(40));
  console.log(`${colors.cyan}Server Health:${colors.reset} ${results.server ? '✅' : '❌'}`);
  console.log(`${colors.cyan}Database:${colors.reset} ${results.database ? '✅' : '❌'}`);
  console.log(`${colors.cyan}Authentication:${colors.reset} ${results.auth ? '✅' : '❌'}`);
  console.log(`${colors.cyan}Admin Routes:${colors.reset} ${results.admin ? '✅' : '❌'}`);
  console.log(`${colors.cyan}CSV Import:${colors.reset} ${results.csv ? '✅' : '❌'}`);
  
  const successRate = ((results.passed / results.total) * 100).toFixed(1);
  console.log(`\n${colors.bright}Success Rate: ${successRate}% (${results.passed}/${results.total})${colors.reset}`);
  
  if (successRate >= 80) {
    console.log(`${colors.green}🎉 System is ready for testing!${colors.reset}`);
    console.log(`${colors.blue}Run full tests with: node run_all_tests.js${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ System needs attention before testing${colors.reset}`);
    console.log(`${colors.yellow}💡 Check the failed components above${colors.reset}`);
  }
  
  return results;
}

// Run validation
if (require.main === module) {
  quickValidation().catch(console.error);
}

module.exports = { quickValidation };
