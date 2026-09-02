const express = require('express');
const { body, validationResult } = require('express-validator');
const { getQuery, allQuery, runQuery } = require('../utils/database');
const { authenticateToken, requireRole, requireRegistrationDesk, requireInvigilator } = require('../middleware/auth');
const { createWithUniqueRegistrationNumber } = require('../utils/helpers');

const router = express.Router();

// Search participants (for invigilators and registration desk)
router.get('/search', authenticateToken, requireRole(['invigilator', 'registration_desk', 'admin']), async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    
    if (!searchTerm || searchTerm.trim() === '') {
      return res.json({ participants: [] });
    }

    const searchPattern = `%${searchTerm}%`;
    const participantsQuery = `
      SELECT id, registration_number, full_name, email, phone, gender,
             age, qualification, father_name, registration_timestamp,
             is_spot_registration, registration_date, created_at,
             attendance_marked, attendance_marked_at
      FROM participants
      WHERE (full_name LIKE ? OR registration_number LIKE ? OR email LIKE ? OR phone LIKE ?)
      ORDER BY full_name ASC
      LIMIT 20
    `;
    
    const participants = await allQuery(participantsQuery, [
      searchPattern, searchPattern, searchPattern, searchPattern
    ]);

    res.json({ participants });
  } catch (error) {
    console.error('Search participants error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all participants (with pagination and search)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', gender = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    let params = [];

    if (search) {
      whereClause += ' AND (full_name LIKE ? OR registration_number LIKE ? OR email LIKE ? OR phone LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (gender) {
      whereClause += ' AND gender = ?';
      params.push(gender);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM participants ${whereClause}`;
    const countResult = await getQuery(countQuery, params);
    const total = countResult.total;

    // Get participants
    const participantsQuery = `
      SELECT id, registration_number, full_name, email, phone, gender,
             age, qualification, father_name, registration_timestamp,
             is_spot_registration, registration_date, created_at,
             attendance_marked, attendance_marked_at
      FROM participants
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const participants = await allQuery(participantsQuery, [...params, limit, offset]);

    res.json({
      participants,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get participants error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get participant by registration number
router.get('/search/:identifier', authenticateToken, async (req, res) => {
  try {
    const { identifier } = req.params;
    
    const participant = await getQuery(
      `SELECT id, registration_number, full_name, email, phone, gender, 
              age, qualification, father_name, registration_timestamp, is_spot_registration, 
              registration_date, created_at
       FROM participants 
       WHERE registration_number = ? OR full_name LIKE ? OR email = ? OR phone = ?`,
      [identifier, `%${identifier}%`, identifier, identifier]
    );

    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    res.json({ participant });
  } catch (error) {
    console.error('Search participant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Validate registration number (for invigilators, evaluators, and registration desk)
router.get('/validate/:registrationNumber', authenticateToken, requireRole(['invigilator', 'evaluator', 'registration_desk', 'admin']), async (req, res) => {
  try {
    const { registrationNumber } = req.params;
    
    const participant = await getQuery(
      'SELECT id, registration_number, full_name, email, phone, gender, age, qualification, father_name, registration_timestamp, is_spot_registration FROM participants WHERE registration_number = ?',
      [registrationNumber]
    );

    if (!participant) {
      return res.status(404).json({ 
        valid: false, 
        message: 'Registration number not found' 
      });
    }

    res.json({ 
      valid: true, 
      participant: {
        id: participant.id,
        registration_number: participant.registration_number,
        full_name: participant.full_name,
        email: participant.email,
        phone: participant.phone,
        gender: participant.gender,
        age: participant.age,
        qualification: participant.qualification,
        father_name: participant.father_name,
        registration_timestamp: participant.registration_timestamp,
        is_spot_registration: participant.is_spot_registration
      }
    });
  } catch (error) {
    console.error('Validate registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new participant (spot registration)
router.post('/', [
  body('full_name').notEmpty().withMessage('Full name is required'),
  body('gender').isIn(['male', 'female', 'other']).withMessage('Valid gender is required'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Valid email is required'),
  body('phone').optional({ checkFalsy: true }).isLength({ min: 10 }).withMessage('Valid phone number is required'),
  body('age').optional({ checkFalsy: true }).isInt({ min: 1, max: 100 }).withMessage('Age must be between 1 and 100'),
  body('qualification').optional({ checkFalsy: true }).isLength({ max: 200 }).withMessage('Qualification too long'),
  body('father_name').optional({ checkFalsy: true }).isLength({ max: 100 }).withMessage('Father name too long')
], authenticateToken, requireRegistrationDesk, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { full_name, email, phone, gender, age, qualification, father_name } = req.body;

    // Check if participant already exists by Full Name + Gender + Age (case-insensitive)
    const existing = await getQuery(
      `SELECT id, registration_number FROM participants WHERE 
       LOWER(full_name) = LOWER(?) AND LOWER(gender) = LOWER(?) AND age = ? AND 
       full_name IS NOT NULL AND gender IS NOT NULL AND age IS NOT NULL`,
      [full_name, gender, age]
    );

    if (existing) {
      return res.status(400).json({ 
        error: 'Participant already exists',
        existing_participant: {
          id: existing.id,
          registration_number: existing.registration_number,
          full_name: full_name
        }
      });
    }

    // Generate unique registration number, retrying on a concurrent collision
    const participant = await createWithUniqueRegistrationNumber(async (registrationNumber) => {
      const result = await runQuery(
        `INSERT INTO participants
         (registration_number, full_name, email, phone, gender, age, qualification, father_name, is_spot_registration)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, true)`,
        [registrationNumber, full_name, email, phone, gender, age, qualification, father_name]
      );

      return getQuery('SELECT * FROM participants WHERE id = ?', [result.id]);
    });

    res.status(201).json({
      message: 'Participant registered successfully',
      participant
    });
  } catch (error) {
    console.error('Create participant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update participant
router.put('/:id', [
  body('full_name').optional().notEmpty().withMessage('Full name cannot be empty'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Valid email is required'),
  body('phone').optional({ checkFalsy: true }).isLength({ min: 10 }).withMessage('Valid phone number is required'),
  body('gender').optional().isIn(['male', 'female', 'other']).withMessage('Valid gender is required')
], authenticateToken, requireRegistrationDesk, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if participant exists
    const existingParticipant = await getQuery(
      'SELECT id FROM participants WHERE id = ?',
      [id]
    );

    if (!existingParticipant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    // Build update query dynamically
    const updateFields = [];
    const values = [];

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined && key !== 'id') {
        updateFields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await runQuery(
      `UPDATE participants SET ${updateFields.join(', ')} WHERE id = ?`,
      values
    );

    const updatedParticipant = await getQuery(
      'SELECT * FROM participants WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Participant updated successfully',
      participant: updatedParticipant
    });
  } catch (error) {
    console.error('Update participant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete participant (admin only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;

    // Check if participant exists
    const existingParticipant = await getQuery(
      'SELECT id FROM participants WHERE id = ?',
      [id]
    );

    if (!existingParticipant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    await runQuery('DELETE FROM participants WHERE id = ?', [id]);

    res.json({ message: 'Participant deleted successfully' });
  } catch (error) {
    console.error('Delete participant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark participant as present (attendance tracking)
router.patch('/:id/present', authenticateToken, requireRegistrationDesk, async (req, res) => {
  try {
    const { id } = req.params;
    const participantId = parseInt(id, 10);

    if (!Number.isInteger(participantId) || participantId <= 0) {
      return res.status(400).json({ error: 'Valid participant ID is required' });
    }

    // Check if participant exists
    const participant = await getQuery(
      'SELECT id, full_name, registration_number, attendance_marked, attendance_marked_at FROM participants WHERE id = ?',
      [participantId]
    );
    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    if (participant.attendance_marked) {
      return res.status(409).json({
        error: 'Attendance already marked for this participant',
        participant: {
          id: participant.id,
          full_name: participant.full_name,
          registration_number: participant.registration_number,
          attendance_marked_at: participant.attendance_marked_at
        }
      });
    }

    // Update attendance status
    await runQuery(
      'UPDATE participants SET attendance_marked = true, attendance_marked_at = CURRENT_TIMESTAMP WHERE id = ?',
      [participantId]
    );

    const updatedParticipant = await getQuery(
      'SELECT id, full_name, registration_number, attendance_marked, attendance_marked_at FROM participants WHERE id = ?',
      [participantId]
    );

    res.json({
      message: 'Participant marked as present',
      participant: updatedParticipant
    });
  } catch (error) {
    console.error('Mark present error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
