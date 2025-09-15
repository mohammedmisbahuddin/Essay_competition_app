const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const API_BASE_URL = 'http://localhost:8000/api';

async function testCSVUpload() {
  console.log('🧪 Testing CSV Upload Functionality');
  console.log('===================================\n');

  try {
    // Test 1: Backend Health Check
    console.log('1. Testing Backend Health...');
    const healthResponse = await axios.get('http://localhost:8000/health/');
    console.log('✅ Backend Health:', healthResponse.data.status);
    console.log('');

    // Test 2: Login to get token
    console.log('2. Getting authentication token...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login/`, {
      username: 'administrator',
      password: 'admin123'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful!');
    console.log('   Token length:', token.length);
    console.log('');

    // Test 3: Create a sample CSV file with correct column names
    console.log('3. Creating sample CSV file...');
    const sampleCSV = `Column 1,Full Name :,Age :,Qualification :,Gender :,Father's Name :,Email id :,Phone :
2025-09-15 10:00:00,John Doe,25,Bachelor's Degree,male,Robert Doe,john.doe@example.com,1234567890
2025-09-15 10:01:00,Jane Smith,23,Master's Degree,female,Michael Smith,jane.smith@example.com,0987654321`;

    const csvFilePath = 'sample_participants.csv';
    fs.writeFileSync(csvFilePath, sampleCSV);
    console.log('✅ Sample CSV file created:', csvFilePath);
    console.log('');

    // Test 4: Test CSV upload
    console.log('4. Testing CSV upload...');
    const formData = new FormData();
    formData.append('csvFile', fs.createReadStream(csvFilePath), {
      filename: 'sample_participants.csv',
      contentType: 'text/csv'
    });

    const uploadResponse = await axios.post(`${API_BASE_URL}/admin/import/csv/`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...formData.getHeaders()
      }
    });

    console.log('✅ CSV upload successful!');
    console.log('   Response:', JSON.stringify(uploadResponse.data, null, 2));
    console.log('');

    // Clean up
    fs.unlinkSync(csvFilePath);
    console.log('✅ Sample CSV file cleaned up');

    console.log('🎉 CSV UPLOAD TEST COMPLETED SUCCESSFULLY!');
    console.log('==========================================');

  } catch (error) {
    console.error('❌ Test failed:');
    console.error('Error:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
    console.error('URL:', error.config?.url);
    
    if (error.response?.data?.error) {
      console.error('Backend Error:', error.response.data.error);
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Troubleshooting:');
      console.error('   - Make sure Django backend is running on port 8000');
      console.error('   - Check if the backend is accessible');
    }
  }
}

testCSVUpload();
