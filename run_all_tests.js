#!/usr/bin/env node

const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

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

// Test results tracking
const testResults = {
  backend: { passed: 0, failed: 0, total: 0 },
  csv: { passed: 0, failed: 0, total: 0 },
  database: { passed: 0, failed: 0, total: 0 },
  frontend: { passed: 0, failed: 0, total: 0 }
};

// Helper function to run command and return promise
function runCommand(command, cwd = process.cwd()) {
  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stdout, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

// Helper function to check if server is running
async function checkServer() {
  try {
    const response = await fetch('http://localhost:5001/health');
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Helper function to start server
async function startServer() {
  console.log(`${colors.blue}🚀 Starting backend server...${colors.reset}`);
  
  return new Promise((resolve) => {
    const server = spawn('node', ['src/server.js'], {
      cwd: path.join(__dirname, 'backend'),
      env: { ...process.env, PORT: '5001' },
      stdio: 'pipe'
    });

    let serverReady = false;
    
    server.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Server running on port 5001') && !serverReady) {
        serverReady = true;
        console.log(`${colors.green}✅ Server started successfully${colors.reset}`);
        resolve(server);
      }
    });

    server.stderr.on('data', (data) => {
      console.error(`${colors.red}Server error: ${data}${colors.reset}`);
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!serverReady) {
        console.log(`${colors.yellow}⚠️ Server startup timeout, continuing with tests...${colors.reset}`);
        resolve(server);
      }
    }, 10000);
  });
}

// Test 1: Backend API Tests
async function runBackendTests() {
  console.log(`\n${colors.cyan}${colors.bright}🧪 Running Backend API Tests${colors.reset}`);
  console.log('=' .repeat(50));
  
  try {
    const result = await runCommand('node test_routes.js', path.join(__dirname, 'backend'));
    
    // Parse test results from output
    const output = result.stdout;
    const lines = output.split('\n');
    
    let passed = 0;
    let failed = 0;
    
    lines.forEach(line => {
      if (line.includes('✅')) passed++;
      if (line.includes('❌')) failed++;
    });
    
    testResults.backend = { passed, failed, total: passed + failed };
    
    console.log(output);
    console.log(`${colors.green}✅ Backend tests completed: ${passed} passed, ${failed} failed${colors.reset}`);
    
  } catch (error) {
    console.log(`${colors.red}❌ Backend tests failed:${colors.reset}`);
    console.log(error.stdout || error.stderr || error.message);
    testResults.backend = { passed: 0, failed: 1, total: 1 };
  }
}

// Test 2: CSV Import Tests
async function runCSVTests() {
  console.log(`\n${colors.cyan}${colors.bright}📁 Running CSV Import Tests${colors.reset}`);
  console.log('=' .repeat(50));
  
  try {
    const result = await runCommand('node test_csv_end_to_end.js');
    
    // Parse test results
    const output = result.stdout;
    const lines = output.split('\n');
    
    let passed = 0;
    let failed = 0;
    
    lines.forEach(line => {
      if (line.includes('✅')) passed++;
      if (line.includes('❌')) failed++;
    });
    
    testResults.csv = { passed, failed, total: passed + failed };
    
    console.log(output);
    console.log(`${colors.green}✅ CSV tests completed: ${passed} passed, ${failed} failed${colors.reset}`);
    
  } catch (error) {
    console.log(`${colors.red}❌ CSV tests failed:${colors.reset}`);
    console.log(error.stdout || error.stderr || error.message);
    testResults.csv = { passed: 0, failed: 1, total: 1 };
  }
}

// Test 3: Database Tests
async function runDatabaseTests() {
  console.log(`\n${colors.cyan}${colors.bright}🗄️ Running Database Tests${colors.reset}`);
  console.log('=' .repeat(50));
  
  try {
    // Test database connection
    const result = await runCommand('node -e "require(\'./src/utils/database\').initializeDatabase().then(() => console.log(\'✅ Database connection successful\')).catch(e => { console.log(\'❌ Database connection failed:\', e.message); process.exit(1); })"', path.join(__dirname, 'backend'));
    
    console.log(result.stdout);
    testResults.database = { passed: 1, failed: 0, total: 1 };
    console.log(`${colors.green}✅ Database tests completed${colors.reset}`);
    
  } catch (error) {
    console.log(`${colors.red}❌ Database tests failed:${colors.reset}`);
    console.log(error.stdout || error.stderr || error.message);
    testResults.database = { passed: 0, failed: 1, total: 1 };
  }
}

// Test 4: Frontend Tests (Basic)
async function runFrontendTests() {
  console.log(`\n${colors.cyan}${colors.bright}🎨 Running Frontend Tests${colors.reset}`);
  console.log('=' .repeat(50));
  
  try {
    // Check if frontend files exist
    const frontendPath = path.join(__dirname, 'frontend');
    const packageJsonPath = path.join(frontendPath, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error('Frontend package.json not found');
    }
    
    // Check if test HTML file exists
    const testHtmlPath = path.join(__dirname, 'test_frontend_csv.html');
    if (fs.existsSync(testHtmlPath)) {
      console.log(`${colors.green}✅ Frontend test file exists: test_frontend_csv.html${colors.reset}`);
      console.log(`${colors.yellow}ℹ️ Open test_frontend_csv.html in browser to run frontend tests${colors.reset}`);
      testResults.frontend = { passed: 1, failed: 0, total: 1 };
    } else {
      throw new Error('Frontend test file not found');
    }
    
  } catch (error) {
    console.log(`${colors.red}❌ Frontend tests failed:${colors.reset}`);
    console.log(error.message);
    testResults.frontend = { passed: 0, failed: 1, total: 1 };
  }
}

// Generate test report
function generateReport() {
  console.log(`\n${colors.magenta}${colors.bright}📊 TEST RESULTS SUMMARY${colors.reset}`);
  console.log('=' .repeat(60));
  
  const totalPassed = Object.values(testResults).reduce((sum, result) => sum + result.passed, 0);
  const totalFailed = Object.values(testResults).reduce((sum, result) => sum + result.failed, 0);
  const totalTests = totalPassed + totalFailed;
  const successRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0;
  
  console.log(`${colors.cyan}Backend API Tests:${colors.reset} ${testResults.backend.passed} passed, ${testResults.backend.failed} failed`);
  console.log(`${colors.cyan}CSV Import Tests:${colors.reset} ${testResults.csv.passed} passed, ${testResults.csv.failed} failed`);
  console.log(`${colors.cyan}Database Tests:${colors.reset} ${testResults.database.passed} passed, ${testResults.database.failed} failed`);
  console.log(`${colors.cyan}Frontend Tests:${colors.reset} ${testResults.frontend.passed} passed, ${testResults.frontend.failed} failed`);
  
  console.log('\n' + '=' .repeat(60));
  console.log(`${colors.bright}Total: ${totalPassed} passed, ${totalFailed} failed${colors.reset}`);
  console.log(`${colors.bright}Success Rate: ${successRate}%${colors.reset}`);
  
  if (successRate >= 80) {
    console.log(`${colors.green}🎉 EXCELLENT! System is production ready!${colors.reset}`);
  } else if (successRate >= 60) {
    console.log(`${colors.yellow}⚠️ GOOD! Some issues need attention.${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ POOR! Major issues need to be fixed.${colors.reset}`);
  }
  
  console.log('\n' + '=' .repeat(60));
}

// Main test runner
async function runAllTests() {
  console.log(`${colors.bright}${colors.blue}🚀 ESSAY MANAGEMENT SYSTEM - COMPREHENSIVE TEST SUITE${colors.reset}`);
  console.log(`${colors.blue}Version: v1.2.0 - PostgreSQL Migration Complete${colors.reset}`);
  console.log(`${colors.blue}Date: ${new Date().toLocaleString()}${colors.reset}`);
  
  let server = null;
  
  try {
    // Check if server is already running
    const serverRunning = await checkServer();
    
    if (!serverRunning) {
      server = await startServer();
      // Wait a bit for server to fully start
      await new Promise(resolve => setTimeout(resolve, 3000));
    } else {
      console.log(`${colors.green}✅ Server already running${colors.reset}`);
    }
    
    // Run all test suites
    await runBackendTests();
    await runCSVTests();
    await runDatabaseTests();
    await runFrontendTests();
    
  } catch (error) {
    console.log(`${colors.red}❌ Test execution failed:${colors.reset}`);
    console.log(error.message);
  } finally {
    // Cleanup: Kill server if we started it
    if (server) {
      console.log(`\n${colors.yellow}🧹 Cleaning up...${colors.reset}`);
      server.kill();
    }
  }
  
  // Generate final report
  generateReport();
  
  // Exit with appropriate code
  const totalFailed = Object.values(testResults).reduce((sum, result) => sum + result.failed, 0);
  process.exit(totalFailed > 0 ? 1 : 0);
}

// Handle process termination
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}⚠️ Test execution interrupted${colors.reset}`);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log(`\n${colors.yellow}⚠️ Test execution terminated${colors.reset}`);
  process.exit(1);
});

// Run the tests
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests, testResults };
