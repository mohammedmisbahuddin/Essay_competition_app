#!/usr/bin/env node

const axios = require('axios');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

const BACKEND_URL = 'http://localhost:5001';
const CONTAINER_NAME = 'essay-backend-test';

async function testDockerLocal() {
  console.log('🐳 Testing Docker Container Locally...');
  console.log('Backend URL:', BACKEND_URL);
  console.log('=' .repeat(50));

  try {
    // Step 1: Build Docker image
    console.log('🔨 Building Docker image...');
    const buildResult = await execAsync('docker build -f Dockerfile.simple -t essay-backend-test .');
    console.log('✅ Docker image built successfully');

    // Step 2: Stop any existing container
    console.log('🛑 Stopping any existing container...');
    try {
      await execAsync(`docker stop ${CONTAINER_NAME}`);
      await execAsync(`docker rm ${CONTAINER_NAME}`);
    } catch (e) {
      // Container might not exist, that's okay
    }

    // Step 3: Run Docker container
    console.log('🚀 Starting Docker container...');
    const containerResult = await execAsync(`docker run -d --name ${CONTAINER_NAME} -p 5001:5001 -e NODE_ENV=production -e PORT=5001 -e JWT_SECRET=test-secret -e JWT_EXPIRES_IN=24h -e DB_HOST=metro.proxy.rlwy.net -e DB_PORT=17709 -e DB_USER=postgres -e DB_PASSWORD=zRiUwAAXIgDcWykrNLZEFKtGpgbqlvjj -e DB_NAME=railway essay-backend-test`);
    console.log('✅ Docker container started');

    // Step 4: Wait for container to start
    console.log('⏳ Waiting for container to start...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Step 5: Test the container
    console.log('🧪 Testing container endpoints...');
    
    const tests = [
      { name: 'Health Check', url: '/health', method: 'GET' },
      { name: 'Admin Login', url: '/api/auth/login', method: 'POST', data: { username: 'admin', password: 'admin123' } }
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
          
          if (test.name === 'Admin Login' && response.data.token) {
            authToken = response.data.token;
            console.log(`   Token received: ${authToken.substring(0, 20)}...`);
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
    console.log(`🎯 Docker container test completed!`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

    if (passed === tests.length) {
      console.log('🎉 Docker container is working perfectly!');
    } else {
      console.log('⚠️ Some tests failed. Check the errors above.');
    }

    // Step 6: Show container logs
    console.log('\n📋 Container logs:');
    try {
      const logs = await execAsync(`docker logs ${CONTAINER_NAME}`);
      console.log(logs.stdout);
    } catch (e) {
      console.log('Could not retrieve logs');
    }

  } catch (error) {
    console.error('❌ Docker test failed:', error.message);
  } finally {
    // Cleanup: Stop and remove container
    console.log('\n🧹 Cleaning up...');
    try {
      await execAsync(`docker stop ${CONTAINER_NAME}`);
      await execAsync(`docker rm ${CONTAINER_NAME}`);
      console.log('✅ Container cleaned up');
    } catch (e) {
      console.log('Container cleanup failed:', e.message);
    }
  }
}

// Run test
if (require.main === module) {
  testDockerLocal().catch(console.error);
}

module.exports = { testDockerLocal };
