#!/usr/bin/env node

const axios = require('axios');
const { Pool } = require('pg');

// Colors for console output
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

// Configuration
const config = {
  backendUrl: process.env.BACKEND_URL || 'http://localhost:5001',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  dbConfig: {
    host: process.env.DB_HOST || process.env.PGHOST,
    port: process.env.DB_PORT || process.env.PGPORT || 5432,
    user: process.env.DB_USER || process.env.PGUSER,
    password: process.env.DB_PASSWORD || process.env.PGPASSWORD,
    database: process.env.DB_NAME || process.env.PGDATABASE,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  }
};

const results = {
  database: { passed: 0, failed: 0, total: 0 },
  backend: { passed: 0, failed: 0, total: 0 },
  frontend: { passed: 0, failed: 0, total: 0 },
  integration: { passed: 0, failed: 0, total: 0 }
};

// Test database connection
async function testDatabase() {
  console.log(`\n${colors.cyan}${colors.bright}🗄️ Testing Database Connection${colors.reset}`);
  console.log('=' .repeat(50));
  
  let pool;
  try {
    pool = new Pool(config.dbConfig);
    const client = await pool.connect();
    
    // Test basic connection
    console.log('📡 Testing database connection...');
    const result = await client.query('SELECT NOW() as current_time');
    console.log(`${colors.green}✅ Database connected successfully${colors.reset}`);
    console.log(`   Current time: ${result.rows[0].current_time}`);
    results.database.passed++;
    results.database.total++;
    
    // Test tables exist
    console.log('\n📊 Checking database tables...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const expectedTables = ['users', 'participants', 'evaluations', 'competition_settings'];
    const existingTables = tablesResult.rows.map(row => row.table_name);
    
    let tablesOk = true;
    for (const table of expectedTables) {
      if (existingTables.includes(table)) {
        console.log(`${colors.green}✅ Table '${table}' exists${colors.reset}`);
        results.database.passed++;
      } else {
        console.log(`${colors.red}❌ Table '${table}' missing${colors.reset}`);
        tablesOk = false;
        results.database.failed++;
      }
      results.database.total++;
    }
    
    // Test admin user exists
    console.log('\n👤 Checking admin user...');
    const adminResult = await client.query('SELECT username, role FROM users WHERE role = $1', ['admin']);
    if (adminResult.rows.length > 0) {
      console.log(`${colors.green}✅ Admin user exists${colors.reset}`);
      results.database.passed++;
    } else {
      console.log(`${colors.red}❌ Admin user missing${colors.reset}`);
      results.database.failed++;
    }
    results.database.total++;
    
    client.release();
    
  } catch (error) {
    console.log(`${colors.red}❌ Database connection failed:${colors.reset}`);
    console.log(`   Error: ${error.message}`);
    results.database.failed++;
    results.database.total++;
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

// Test backend API
async function testBackend() {
  console.log(`\n${colors.cyan}${colors.bright}🔧 Testing Backend API${colors.reset}`);
  console.log('=' .repeat(50));
  
  const tests = [
    { name: 'Health Check', url: '/health', method: 'GET' },
    { name: 'Admin Login', url: '/api/auth/login', method: 'POST', data: { username: 'admin', password: 'admin123' } },
    { name: 'Admin Stats', url: '/api/admin/stats', method: 'GET', auth: true },
    { name: 'Admin Dashboard', url: '/api/admin/dashboard', method: 'GET', auth: true },
    { name: 'Get Participants', url: '/api/participants', method: 'GET', auth: true }
  ];
  
  let authToken = null;
  
  for (const test of tests) {
    try {
      console.log(`\n🧪 Testing ${test.name}...`);
      
      const config = {
        method: test.method,
        url: `${config.backendUrl}${test.url}`,
        headers: { 'Content-Type': 'application/json' },
        ...(test.data && { data: test.data }),
        ...(test.auth && authToken && { headers: { ...config.headers, 'Authorization': `Bearer ${authToken}` } })
      };
      
      const response = await axios(config);
      
      if (response.status === 200 || response.status === 201) {
        console.log(`${colors.green}✅ ${test.name} working${colors.reset}`);
        results.backend.passed++;
        
        // Store auth token for subsequent requests
        if (test.name === 'Admin Login' && response.data.token) {
          authToken = response.data.token;
        }
      } else {
        console.log(`${colors.red}❌ ${test.name} failed (${response.status})${colors.reset}`);
        results.backend.failed++;
      }
      
    } catch (error) {
      console.log(`${colors.red}❌ ${test.name} failed:${colors.reset}`);
      console.log(`   Error: ${error.response?.data?.error || error.message}`);
      results.backend.failed++;
    }
    
    results.backend.total++;
  }
}

// Test frontend (basic check)
async function testFrontend() {
  console.log(`\n${colors.cyan}${colors.bright}🎨 Testing Frontend${colors.reset}`);
  console.log('=' .repeat(50));
  
  try {
    console.log('🌐 Checking frontend accessibility...');
    const response = await axios.get(config.frontendUrl, { timeout: 5000 });
    
    if (response.status === 200) {
      console.log(`${colors.green}✅ Frontend accessible${colors.reset}`);
      results.frontend.passed++;
    } else {
      console.log(`${colors.red}❌ Frontend not accessible (${response.status})${colors.reset}`);
      results.frontend.failed++;
    }
    
  } catch (error) {
    console.log(`${colors.red}❌ Frontend not accessible:${colors.reset}`);
    console.log(`   Error: ${error.message}`);
    results.frontend.failed++;
  }
  
  results.frontend.total++;
}

// Test integration
async function testIntegration() {
  console.log(`\n${colors.cyan}${colors.bright}🔗 Testing Integration${colors.reset}`);
  console.log('=' .repeat(50));
  
  try {
    // Test CSV import
    console.log('📁 Testing CSV import...');
    const loginResponse = await axios.post(`${config.backendUrl}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    
    // Create test CSV
    const testCSV = `full_name,email,phone,gender,age,qualification,father_name
Test User,test@example.com,1234567890,male,25,Bachelor,Test Father`;
    
    const FormData = require('form-data');
    const form = new FormData();
    form.append('csvFile', testCSV, { filename: 'test.csv', contentType: 'text/csv' });
    
    const csvResponse = await axios.post(`${config.backendUrl}/api/admin/import/csv`, form, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...form.getHeaders()
      }
    });
    
    if (csvResponse.status === 200) {
      console.log(`${colors.green}✅ CSV import working${colors.reset}`);
      results.integration.passed++;
    } else {
      console.log(`${colors.red}❌ CSV import failed${colors.reset}`);
      results.integration.failed++;
    }
    
  } catch (error) {
    console.log(`${colors.red}❌ Integration test failed:${colors.reset}`);
    console.log(`   Error: ${error.response?.data?.error || error.message}`);
    results.integration.failed++;
  }
  
  results.integration.total++;
}

// Generate report
function generateReport() {
  console.log(`\n${colors.magenta}${colors.bright}📊 RAILWAY DEPLOYMENT VALIDATION REPORT${colors.reset}`);
  console.log('=' .repeat(60));
  
  const totalPassed = Object.values(results).reduce((sum, result) => sum + result.passed, 0);
  const totalFailed = Object.values(results).reduce((sum, result) => sum + result.failed, 0);
  const totalTests = totalPassed + totalFailed;
  const successRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0;
  
  console.log(`${colors.cyan}Database Tests:${colors.reset} ${results.database.passed} passed, ${results.database.failed} failed`);
  console.log(`${colors.cyan}Backend Tests:${colors.reset} ${results.backend.passed} passed, ${results.backend.failed} failed`);
  console.log(`${colors.cyan}Frontend Tests:${colors.reset} ${results.frontend.passed} passed, ${results.frontend.failed} failed`);
  console.log(`${colors.cyan}Integration Tests:${colors.reset} ${results.integration.passed} passed, ${results.integration.failed} failed`);
  
  console.log('\n' + '=' .repeat(60));
  console.log(`${colors.bright}Total: ${totalPassed} passed, ${totalFailed} failed${colors.reset}`);
  console.log(`${colors.bright}Success Rate: ${successRate}%${colors.reset}`);
  
  if (successRate >= 80) {
    console.log(`${colors.green}🎉 EXCELLENT! Railway deployment is successful!${colors.reset}`);
  } else if (successRate >= 60) {
    console.log(`${colors.yellow}⚠️ GOOD! Some issues need attention.${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ POOR! Major issues need to be fixed.${colors.reset}`);
  }
  
  console.log('\n' + '=' .repeat(60));
}

// Main validation function
async function validateRailwayDeployment() {
  console.log(`${colors.bright}${colors.blue}🚀 RAILWAY DEPLOYMENT VALIDATION${colors.reset}`);
  console.log(`${colors.blue}Backend URL: ${config.backendUrl}${colors.reset}`);
  console.log(`${colors.blue}Frontend URL: ${config.frontendUrl}${colors.reset}`);
  console.log(`${colors.blue}Date: ${new Date().toLocaleString()}${colors.reset}`);
  
  try {
    await testDatabase();
    await testBackend();
    await testFrontend();
    await testIntegration();
  } catch (error) {
    console.log(`${colors.red}❌ Validation failed:${colors.reset}`);
    console.log(error.message);
  }
  
  generateReport();
  
  // Exit with appropriate code
  const totalFailed = Object.values(results).reduce((sum, result) => sum + result.failed, 0);
  process.exit(totalFailed > 0 ? 1 : 0);
}

// Run validation
if (require.main === module) {
  validateRailwayDeployment().catch(console.error);
}

module.exports = { validateRailwayDeployment, results };
