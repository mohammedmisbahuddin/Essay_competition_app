const fs = require('fs');
const csv = require('csv-parser');
const { getQuery, runQuery } = require('./src/utils/database');
const { cleanParticipantData, generateRegistrationNumber } = require('./src/utils/helpers');

async function testCSVImport() {
  console.log('Testing CSV import functionality...');
  
  try {
    // Read test CSV file
    const participants = [];
    const filePath = '../test_participants.csv';
    
    const stream = fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        participants.push(row);
      })
      .on('end', async () => {
        console.log('Raw data sample:', participants.slice(0, 2));
        
        // Clean and validate data
        const cleanedData = cleanParticipantData(participants);
        console.log('Cleaned data sample:', cleanedData.slice(0, 2));
        console.log('Total cleaned participants:', cleanedData.length);
        
        // Test database insertion
        for (const participant of cleanedData) {
          try {
            const registrationNumber = await generateRegistrationNumber();
            console.log(`Generated registration number: ${registrationNumber} for ${participant.full_name}`);
            
            await runQuery(`
              INSERT INTO participants (
                registration_number, full_name, email, phone, gender,
                age, qualification, father_name, registration_timestamp, is_spot_registration
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, false)
            `, [
              registrationNumber, participant.full_name, participant.email,
              participant.phone, participant.gender, participant.age,
              participant.qualification, participant.father_name, participant.registration_timestamp
            ]);
            
            console.log(`✅ Successfully created participant: ${participant.full_name}`);
          } catch (error) {
            console.error(`❌ Error creating participant ${participant.full_name}:`, error.message);
          }
        }
        
        console.log('CSV import test completed!');
        process.exit(0);
      })
      .on('error', (error) => {
        console.error('Error reading CSV:', error);
        process.exit(1);
      });
      
  } catch (error) {
    console.error('Test error:', error);
    process.exit(1);
  }
}

testCSVImport();
