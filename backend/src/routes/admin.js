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
             AVG(e.introduction_marks + e.content_marks + e.conclusion_marks + 
                 e.handwriting_marks + e.grammar_marks + e.special_points) as average_score,
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

// Get dashboard statistics only
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await generateStatistics();
    res.json(stats);
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

// Get all results with pagination and sorting
router.get('/results', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      sortBy = 'total_marks', 
      sortOrder = 'DESC',
      gender = '',
      search = ''
    } = req.query;
    
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE e.is_submitted = true';
    let params = [];

    if (gender) {
      whereClause += ' AND p.gender = ?';
      params.push(gender);
    }

    if (search) {
      whereClause += ' AND (p.full_name LIKE ? OR p.registration_number LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    // Validate sortBy to prevent SQL injection
    const allowedSortColumns = ['average_marks', 'full_name', 'registration_number', 'gender'];
    const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'average_marks';
    const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const results = await allQuery(`
      SELECT p.id, p.registration_number, p.full_name, p.gender, p.qualification,
             AVG(e.introduction_marks + e.content_marks + e.conclusion_marks + 
                 e.handwriting_marks + e.grammar_marks + e.special_points) as average_marks,
             COUNT(e.id) as evaluation_count,
             MIN(e.introduction_marks + e.content_marks + e.conclusion_marks + 
                 e.handwriting_marks + e.grammar_marks + e.special_points) as min_marks,
             MAX(e.introduction_marks + e.content_marks + e.conclusion_marks + 
                 e.handwriting_marks + e.grammar_marks + e.special_points) as max_marks
      FROM participants p
      JOIN evaluations e ON p.id = e.participant_id
      ${whereClause}
      GROUP BY p.id, p.registration_number, p.full_name, p.gender, p.qualification
      ORDER BY ${sortColumn} ${sortDirection}
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    // Get total count
    const countResult = await getQuery(`
      SELECT COUNT(DISTINCT p.id) as total
      FROM participants p
      JOIN evaluations e ON p.id = e.participant_id
      ${whereClause}
    `, params);

    res.json({
      results,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await allQuery(`
      SELECT id, username, email, role, full_name, is_active, created_at
      FROM users
      ORDER BY created_at DESC
    `);

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new user
router.post('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { username, password, role, email, full_name } = req.body;

    // Validate required fields
    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Username, password, and role are required' });
    }

    // Validate role
    const validRoles = ['admin', 'registration_desk', 'invigilator', 'evaluator'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be one of: admin, registration_desk, invigilator, evaluator' });
    }

    // Check if username already exists
    const existingUser = await getQuery('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await runQuery(
      'INSERT INTO users (username, password_hash, role, email, full_name) VALUES (?, ?, ?, ?, ?)',
      [username, hashedPassword, role, email || `${username}@example.com`, full_name || username]
    );

    res.status(201).json({ 
      message: 'User created successfully',
      user: {
        id: result.id,
        username,
        role,
        email: email || `${username}@example.com`,
        full_name: full_name || username,
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get competition settings
router.get('/settings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const settings = await allQuery(
      'SELECT setting_key, setting_value, description FROM competition_settings ORDER BY setting_key'
    );

    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.setting_key] = {
        value: setting.setting_value,
        description: setting.description
      };
    });

    res.json({ settings: settingsObj });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export results to CSV
router.get('/export/results', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const results = await allQuery(`
      SELECT p.registration_number, p.full_name, p.gender, p.email, p.phone, p.qualification,
             AVG(e.introduction_marks + e.content_marks + e.conclusion_marks + 
                 e.handwriting_marks + e.grammar_marks + e.special_points) as average_marks,
             COUNT(e.id) as evaluation_count
      FROM participants p
      LEFT JOIN evaluations e ON p.id = e.participant_id AND e.is_submitted = true
      GROUP BY p.id, p.registration_number, p.full_name, p.gender, p.email, p.phone, p.qualification
      ORDER BY average_marks DESC
    `);

    // Convert to CSV
    const csvHeader = 'Registration Number,Full Name,Gender,Email,Phone,Qualification,Average Marks,Evaluation Count\n';
    const csvData = results.map(row => 
      `"${row.registration_number}","${row.full_name}","${row.gender}","${row.email || ''}","${row.phone || ''}","${row.qualification || ''}","${row.average_marks || 0}","${row.evaluation_count || 0}"`
    ).join('\n');

    const csv = csvHeader + csvData;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="essay_competition_results.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Export results error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Clear all data (CRITICAL OPERATION - requires double confirmation)
router.delete('/clear-all-data', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { confirmCode } = req.body;
    
    // Double confirmation required
    if (confirmCode !== 'CLEAR_ALL_DATA_CONFIRM') {
      return res.status(400).json({ 
        error: 'Invalid confirmation code. This operation requires explicit confirmation.',
        message: 'To clear all data, you must provide the exact confirmation code: CLEAR_ALL_DATA_CONFIRM'
      });
    }

    console.log('🚨 CRITICAL OPERATION: Clearing all data initiated by admin:', req.user.username);
    
    // Clear all tables in correct order (respecting foreign key constraints)
    await runQuery('DELETE FROM evaluations');
    console.log('✅ Cleared evaluations table');
    
    await runQuery('DELETE FROM participants');
    console.log('✅ Cleared participants table');
    
    // Note: We don't clear users table to prevent admin lockout
    // Only clear non-admin users if needed
    const adminUsers = await allQuery('SELECT id FROM users WHERE role = ?', ['admin']);
    if (adminUsers.length > 0) {
      await runQuery('DELETE FROM users WHERE role != ?', ['admin']);
      console.log('✅ Cleared non-admin users (preserved admin accounts)');
    }
    
    // Reset auto-increment sequences for PostgreSQL
    await runQuery('ALTER SEQUENCE participants_id_seq RESTART WITH 1');
    await runQuery('ALTER SEQUENCE evaluations_id_seq RESTART WITH 1');
    console.log('✅ Reset auto-increment sequences');
    
    console.log('🚨 CRITICAL OPERATION COMPLETED: All data cleared successfully');
    
    res.json({
      message: 'All data has been cleared successfully',
      warning: 'This operation cannot be undone',
      cleared_tables: ['participants', 'evaluations', 'non-admin users'],
      preserved: ['admin users', 'competition settings']
    });
    
  } catch (error) {
    console.error('❌ Error clearing all data:', error);
    res.status(500).json({ 
      error: 'Failed to clear all data',
      details: error.message 
    });
  }
});

module.exports = router;
