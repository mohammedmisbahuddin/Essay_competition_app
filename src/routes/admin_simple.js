const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { getQuery, allQuery, runQuery } = require('../utils/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { generateStatistics, cleanParticipantData, generateRegistrationNumber } = require('../utils/helpers');

const router = express.Router();

// Get dashboard statistics
router.get('/dashboard', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await generateStatistics();

    // Get top performers
    const topPerformers = await allQuery(`
      SELECT p.registration_number, p.full_name, p.gender, 
             AVG(e.score) as average_score,
             COUNT(e.id) as evaluation_count
      FROM participants p
      LEFT JOIN evaluations e ON p.id = e.participant_id
      WHERE e.is_submitted = true
      GROUP BY p.id, p.registration_number, p.full_name, p.gender
      ORDER BY average_score DESC
      LIMIT 10
    `);

    res.json({
      stats,
      topPerformers
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'participants-' + uniqueSuffix + '.csv');
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Import participants from CSV file
router.post('/import/csv', authenticateToken, requireAdmin, upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file uploaded' });
    }

    const filePath = req.file.path;
    const results = {
      total: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    // Read and parse CSV file
    const participants = [];
    const stream = fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        participants.push(row);
      })
      .on('end', async () => {
        try {
          results.total = participants.length;
          
          if (participants.length === 0) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ error: 'No data found in CSV file' });
          }

          // Clean and validate data
          const cleanedData = cleanParticipantData(participants);

          if (cleanedData.length === 0) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ error: 'No valid participant data found after cleaning' });
          }

          // Process participants
          for (const participant of cleanedData) {
            try {
              // Check if participant already exists by email or phone
              let existingParticipant = null;
              
              if (participant.email) {
                existingParticipant = await getQuery(
                  'SELECT * FROM participants WHERE email = ?',
                  [participant.email]
                );
              }
              
              if (!existingParticipant && participant.phone) {
                existingParticipant = await getQuery(
                  'SELECT * FROM participants WHERE phone = ?',
                  [participant.phone]
                );
              }

              if (existingParticipant) {
                // Update existing participant
                await runQuery(`
                  UPDATE participants SET 
                    full_name = ?, phone = ?, gender = ?, age = ?, 
                    qualification = ?, father_name = ?, registration_timestamp = ?
                  WHERE id = ?
                `, [
                  participant.full_name, participant.phone, participant.gender,
                  participant.age, participant.qualification, participant.father_name,
                  participant.registration_timestamp, existingParticipant.id
                ]);
                results.updated++;
                console.log(`Updated existing participant: ${participant.full_name}`);
              } else {
                // Create new participant
                const registrationNumber = await generateRegistrationNumber();
                console.log(`Generating registration number: ${registrationNumber} for ${participant.full_name}`);
                
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
                results.created++;
                console.log(`Created new participant: ${participant.full_name} (Reg: ${registrationNumber})`);
              }
            } catch (error) {
              console.error('Error processing participant:', error);
              results.errors.push({
                participant: participant.full_name || 'Unknown',
                error: error.message
              });
              results.skipped++;
            }
          }

          // Clean up file
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }

          res.json({
            message: 'CSV import completed successfully',
            results
          });
        } catch (error) {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          console.error('CSV processing error:', error);
          res.status(500).json({ error: 'Failed to process CSV file' });
        }
      })
      .on('error', (error) => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        console.error('CSV reading error:', error);
        res.status(500).json({ error: 'Failed to read CSV file' });
      });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('CSV import error:', error);
    res.status(500).json({ error: 'Failed to import CSV file' });
  }
});

module.exports = router;
