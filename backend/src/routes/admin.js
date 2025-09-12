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
             AVG(e.total_marks) as average_marks,
             COUNT(e.id) as evaluation_count
      FROM participants p
      LEFT JOIN evaluations e ON p.id = e.participant_id AND e.is_submitted = 1
      GROUP BY p.id, p.registration_number, p.full_name, p.gender
      HAVING evaluation_count > 0
      ORDER BY average_marks DESC
      LIMIT 20
    `);

    // Get top 3 boys and girls
    const topBoys = await allQuery(`
      SELECT p.registration_number, p.full_name, 
             AVG(e.total_marks) as average_marks
      FROM participants p
      JOIN evaluations e ON p.id = e.participant_id AND e.is_submitted = 1
      WHERE p.gender = 'male'
      GROUP BY p.id, p.registration_number, p.full_name
      ORDER BY average_marks DESC
      LIMIT 3
    `);

    const topGirls = await allQuery(`
      SELECT p.registration_number, p.full_name, 
             AVG(e.total_marks) as average_marks
      FROM participants p
      JOIN evaluations e ON p.id = e.participant_id AND e.is_submitted = 1
      WHERE p.gender = 'female'
      GROUP BY p.id, p.registration_number, p.full_name
      ORDER BY average_marks DESC
      LIMIT 3
    `);

    res.json({
      statistics: stats,
      topPerformers,
      topBoys,
      topGirls
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
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

// Import participants from CSV file
router.post('/import/csv', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const multer = require('multer');
    const csv = require('csv-parser');
    const fs = require('fs');
    const path = require('path');

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

    // Handle single file upload
    upload.single('csvFile')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No CSV file uploaded' });
      }

      try {
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
                // Clean up file
                fs.unlinkSync(filePath);
                return res.status(400).json({ error: 'No data found in CSV file' });
              }

              // Clean and validate data
              const { cleanParticipantData, generateRegistrationNumber } = require('../utils/helpers');
              const cleanedData = cleanParticipantData(participants);

              if (cleanedData.length === 0) {
                // Clean up file
                fs.unlinkSync(filePath);
                return res.status(400).json({ error: 'No valid participant data found after cleaning' });
              }

              // Process participants with smart duplicate handling
              for (const participant of cleanedData) {
                try {
                  // Check if participant already exists by Full Name + Gender + Age (case-insensitive)
                  const existing = await getQuery(
                    `SELECT id, registration_number FROM participants WHERE 
                     LOWER(full_name) = LOWER(?) AND LOWER(gender) = LOWER(?) AND age = ? AND 
                     full_name IS NOT NULL AND gender IS NOT NULL AND age IS NOT NULL`,
                    [participant.full_name, participant.gender, participant.age]
                  );

                  if (existing) {
                    // Participant exists - skip creation (as requested)
                    results.skipped++;
                    console.log(`Skipping existing participant: ${participant.full_name} (ID: ${existing.id}, Reg: ${existing.registration_number})`);
                  } else {
                    // Create new participant
                    const registrationNumber = await generateRegistrationNumber();
                    console.log(`Generating registration number: ${registrationNumber} for ${participant.full_name}`);
                    
                    await runQuery(`
                      INSERT INTO participants (
                        registration_number, full_name, email, phone, gender,
                        age, qualification, father_name, registration_timestamp, is_spot_registration
                      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
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

              // Clean up uploaded file
              fs.unlinkSync(filePath);

              res.json({
                message: 'CSV import completed successfully',
                results
              });

            } catch (error) {
              // Clean up file on error
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
              }
              console.error('CSV processing error:', error);
              res.status(500).json({ error: 'Failed to process CSV file' });
            }
          })
          .on('error', (error) => {
            // Clean up file on error
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
            console.error('CSV reading error:', error);
            res.status(500).json({ error: 'Failed to read CSV file' });
          });
      } catch (error) {
        // Clean up file on error
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        console.error('CSV import error:', error);
        res.status(500).json({ error: 'Failed to import CSV file' });
      }
    });

  } catch (error) {
    console.error('CSV import setup error:', error);
    res.status(500).json({ error: 'Failed to setup CSV import' });
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

    let whereClause = 'WHERE e.is_submitted = 1';
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
    const allowedSortColumns = ['total_marks', 'full_name', 'registration_number', 'gender', 'average_marks'];
    const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'total_marks';
    const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const results = await allQuery(`
      SELECT p.id, p.registration_number, p.full_name, p.gender, p.qualification,
             AVG(e.total_marks) as average_marks,
             COUNT(e.id) as evaluation_count,
             MIN(e.total_marks) as min_marks,
             MAX(e.total_marks) as max_marks,
             GROUP_CONCAT(e.comments, ' | ') as all_comments
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

// Get detailed evaluation for a participant
router.get('/results/:participantId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { participantId } = req.params;

    // Get participant details
    const participant = await getQuery(
      'SELECT * FROM participants WHERE id = ?',
      [participantId]
    );

    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    // Get all evaluations for this participant
    const evaluations = await allQuery(`
      SELECT e.*, u.full_name as evaluator_name, u.username as evaluator_username
      FROM evaluations e
      JOIN users u ON e.evaluator_id = u.id
      WHERE e.participant_id = ?
      ORDER BY e.created_at DESC
    `, [participantId]);

    // Calculate statistics
    const stats = {
      totalEvaluations: evaluations.length,
      submittedEvaluations: evaluations.filter(e => e.is_submitted).length,
      averageMarks: evaluations.length > 0 
        ? evaluations.reduce((sum, e) => sum + e.total_marks, 0) / evaluations.length 
        : 0,
      minMarks: evaluations.length > 0 ? Math.min(...evaluations.map(e => e.total_marks)) : 0,
      maxMarks: evaluations.length > 0 ? Math.max(...evaluations.map(e => e.total_marks)) : 0
    };

    res.json({
      participant,
      evaluations,
      statistics: stats
    });
  } catch (error) {
    console.error('Get participant details error:', error);
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

// Update user status
router.patch('/users/:userId/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active must be a boolean' });
    }

    await runQuery(
      'UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [is_active, userId]
    );

    res.json({ message: 'User status updated successfully' });
  } catch (error) {
    console.error('Update user status error:', error);
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

// Update competition settings
router.put('/settings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Settings object is required' });
    }

    for (const [key, value] of Object.entries(settings)) {
      await runQuery(
        'UPDATE competition_settings SET setting_value = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_key = ?',
        [value, key]
      );
    }

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export results to CSV
router.get('/export/results', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const results = await allQuery(`
      SELECT p.registration_number, p.full_name, p.gender, p.email, p.phone, p.qualification,
             AVG(e.total_marks) as average_marks,
             COUNT(e.id) as evaluation_count
      FROM participants p
      LEFT JOIN evaluations e ON p.id = e.participant_id AND e.is_submitted = 1
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

// Get all users
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await allQuery(`
      SELECT id, username, role, created_at, last_login
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
    const { username, password, role } = req.body;

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
      [username, hashedPassword, role, `${username}@example.com`, username]
    );

    res.status(201).json({ 
      message: 'User created successfully',
      user: {
        id: result.lastID,
        username,
        role,
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user
router.put('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, role } = req.body;

    // Validate required fields
    if (!username || !role) {
      return res.status(400).json({ error: 'Username and role are required' });
    }

    // Validate role
    const validRoles = ['admin', 'registration_desk', 'invigilator', 'evaluator'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be one of: admin, registration_desk, invigilator, evaluator' });
    }

    // Check if user exists
    const existingUser = await getQuery('SELECT id FROM users WHERE id = ?', [id]);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if username already exists (excluding current user)
    const usernameExists = await getQuery('SELECT id FROM users WHERE username = ? AND id != ?', [username, id]);
    if (usernameExists) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    let updateQuery = 'UPDATE users SET username = ?, role = ?';
    let params = [username, role];

    // Update password only if provided
    if (password) {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      updateQuery += ', password_hash = ?';
      params.push(hashedPassword);
    }

    updateQuery += ' WHERE id = ?';
    params.push(id);

    await runQuery(updateQuery, params);

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user
router.delete('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await getQuery('SELECT id, role FROM users WHERE id = ?', [id]);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deleting the last admin
    if (existingUser.role === 'admin') {
      const adminCount = await getQuery('SELECT COUNT(*) as count FROM users WHERE role = ?', ['admin']);
      if (adminCount.count <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last admin user' });
      }
    }

    await runQuery('DELETE FROM users WHERE id = ?', [id]);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
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
    
    // Reset registration number sequence
    await runQuery('DELETE FROM sqlite_sequence WHERE name IN (?, ?)', ['participants', 'evaluations']);
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

