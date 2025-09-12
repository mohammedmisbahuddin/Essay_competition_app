const express = require('express');
const { getQuery, allQuery, runQuery } = require('../utils/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { generateStatistics } = require('../utils/helpers');

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
                  // Check if participant already exists by multiple criteria
                  const existing = await getQuery(
                    `SELECT id, registration_number FROM participants WHERE 
                     (email = ? AND email IS NOT NULL AND email != '') OR 
                     (full_name = ? AND age = ? AND age IS NOT NULL) OR
                     (phone = ? AND phone IS NOT NULL AND phone != '')`,
                    [participant.email, participant.full_name, participant.age, participant.phone]
                  );

                  if (existing) {
                    // Participant exists - skip creation (as requested)
                    results.skipped++;
                    console.log(`Skipping existing participant: ${participant.full_name} (ID: ${existing.id})`);
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
      SELECT p.id, p.registration_number, p.full_name, p.gender, p.institution,
             AVG(e.total_marks) as average_marks,
             COUNT(e.id) as evaluation_count,
             MIN(e.total_marks) as min_marks,
             MAX(e.total_marks) as max_marks,
             GROUP_CONCAT(e.comments, ' | ') as all_comments
      FROM participants p
      JOIN evaluations e ON p.id = e.participant_id
      ${whereClause}
      GROUP BY p.id, p.registration_number, p.full_name, p.gender, p.institution
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
      SELECT p.registration_number, p.full_name, p.gender, p.email, p.phone, p.institution,
             AVG(e.total_marks) as average_marks,
             COUNT(e.id) as evaluation_count
      FROM participants p
      LEFT JOIN evaluations e ON p.id = e.participant_id AND e.is_submitted = 1
      GROUP BY p.id, p.registration_number, p.full_name, p.gender, p.email, p.phone, p.institution
      ORDER BY average_marks DESC
    `);

    // Convert to CSV
    const csvHeader = 'Registration Number,Full Name,Gender,Email,Phone,Institution,Average Marks,Evaluation Count\n';
    const csvData = results.map(row => 
      `"${row.registration_number}","${row.full_name}","${row.gender}","${row.email || ''}","${row.phone || ''}","${row.institution || ''}","${row.average_marks || 0}","${row.evaluation_count || 0}"`
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

module.exports = router;

