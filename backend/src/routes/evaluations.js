const express = require('express');
const { body, validationResult } = require('express-validator');
const { getQuery, allQuery, runQuery } = require('../utils/database');
const { authenticateToken, requireEvaluator } = require('../middleware/auth');

const router = express.Router();

// Get evaluation by participant ID
router.get('/participant/:participantId', authenticateToken, requireEvaluator, async (req, res) => {
  try {
    const { participantId } = req.params;

    const evaluation = await getQuery(
      `SELECT * FROM evaluations 
       WHERE participant_id = ? AND evaluator_id = ?`,
      [participantId, req.user.id]
    );

    res.json({ evaluation });
  } catch (error) {
    console.error('Get evaluation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new evaluation
router.post('/', authenticateToken, requireEvaluator, async (req, res) => {
  try {
    const {
      participant_id,
      introduction,
      content,
      conclusion,
      handwriting,
      grammar_spelling,
      special_points,
      total_marks,
      comments
    } = req.body;

    // Check if evaluation already exists
    const existingEvaluation = await getQuery(
      `SELECT id FROM evaluations 
       WHERE participant_id = ? AND evaluator_id = ?`,
      [participant_id, req.user.id]
    );

    if (existingEvaluation) {
      return res.status(400).json({ error: 'Evaluation already exists for this participant' });
    }

    const result = await runQuery(
      `INSERT INTO evaluations 
       (participant_id, evaluator_id, introduction_marks, content_marks, conclusion_marks, 
        handwriting_marks, grammar_marks, special_points, comments, is_submitted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        participant_id, req.user.id, introduction, content, conclusion,
        handwriting, grammar_spelling, special_points, comments || '', false
      ]
    );

    const evaluation = await getQuery(
      'SELECT * FROM evaluations WHERE id = ?',
      [result.lastID]
    );

    res.status(201).json({ evaluation });
  } catch (error) {
    console.error('Create evaluation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update existing evaluation
router.put('/:id', authenticateToken, requireEvaluator, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      introduction,
      content,
      conclusion,
      handwriting,
      grammar_spelling,
      special_points,
      total_marks,
      comments
    } = req.body;

    // Check if evaluation exists and belongs to this evaluator
    const existingEvaluation = await getQuery(
      'SELECT * FROM evaluations WHERE id = ? AND evaluator_id = ?',
      [id, req.user.id]
    );

    if (!existingEvaluation) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }

    if (existingEvaluation.is_submitted) {
      return res.status(400).json({ error: 'Cannot update submitted evaluation' });
    }

    await runQuery(
      `UPDATE evaluations SET 
       introduction_marks = ?, content_marks = ?, conclusion_marks = ?, handwriting_marks = ?,
       grammar_marks = ?, special_points = ?, 
       comments = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        introduction, content, conclusion, handwriting,
        grammar_spelling, special_points, comments || '', id
      ]
    );

    const evaluation = await getQuery(
      'SELECT * FROM evaluations WHERE id = ?',
      [id]
    );

    res.json({ evaluation });
  } catch (error) {
    console.error('Update evaluation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Confirm evaluation
router.post('/:id/confirm', authenticateToken, requireEvaluator, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if evaluation exists and belongs to this evaluator
    const existingEvaluation = await getQuery(
      'SELECT * FROM evaluations WHERE id = ? AND evaluator_id = ?',
      [id, req.user.id]
    );

    if (!existingEvaluation) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }

    if (existingEvaluation.is_submitted) {
      return res.status(400).json({ error: 'Evaluation already submitted' });
    }

    await runQuery(
      'UPDATE evaluations SET is_submitted = true, submitted_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );

    const evaluation = await getQuery(
      'SELECT * FROM evaluations WHERE id = ?',
      [id]
    );

    res.json({ evaluation });
  } catch (error) {
    console.error('Confirm evaluation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get evaluation form for a participant
router.get('/participant/:registrationNumber', authenticateToken, requireEvaluator, async (req, res) => {
  try {
    const { registrationNumber } = req.params;

    // Get participant details
    const participant = await getQuery(
      `SELECT id, registration_number, full_name, email, phone, gender, 
              age, qualification, father_name, registration_timestamp, is_spot_registration
       FROM participants 
       WHERE registration_number = ?`,
      [registrationNumber]
    );

    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    // Get existing evaluation if any
    const existingEvaluation = await getQuery(
      `SELECT * FROM evaluations 
       WHERE participant_id = ? AND evaluator_id = ?`,
      [participant.id, req.user.id]
    );

    // Get competition settings for max marks
    const settings = await allQuery(
      'SELECT setting_key, setting_value FROM competition_settings'
    );
    
    const maxMarks = {};
    settings.forEach(setting => {
      maxMarks[setting.setting_key] = parseInt(setting.setting_value);
    });

    res.json({
      participant,
      evaluation: existingEvaluation || null,
      maxMarks
    });
  } catch (error) {
    console.error('Get evaluation form error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit evaluation
router.post('/', [
  body('participant_id').isInt().withMessage('Valid participant ID is required'),
  body('introduction_marks').optional().isInt({ min: 0, max: 10 }).withMessage('Introduction marks must be between 0 and 10'),
  body('content_marks').optional().isInt({ min: 0, max: 20 }).withMessage('Content marks must be between 0 and 20'),
  body('conclusion_marks').optional().isInt({ min: 0, max: 10 }).withMessage('Conclusion marks must be between 0 and 10'),
  body('handwriting_marks').optional().isInt({ min: 0, max: 10 }).withMessage('Handwriting marks must be between 0 and 10'),
  body('grammar_marks').optional().isInt({ min: 0, max: 10 }).withMessage('Grammar marks must be between 0 and 10'),
  body('special_points').optional().isInt({ min: 0, max: 10 }).withMessage('Special points must be between 0 and 10'),
  body('comments').optional().isLength({ max: 1000 }).withMessage('Comments too long')
], authenticateToken, requireEvaluator, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      participant_id,
      introduction_marks,
      content_marks,
      conclusion_marks,
      handwriting_marks,
      grammar_marks,
      special_points,
      comments
    } = req.body;

    // Verify participant exists
    const participant = await getQuery(
      'SELECT id, registration_number, full_name FROM participants WHERE id = ?',
      [participant_id]
    );

    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    // Check if evaluation already exists
    const existingEvaluation = await getQuery(
      'SELECT id, is_submitted FROM evaluations WHERE participant_id = ? AND evaluator_id = ?',
      [participant_id, req.user.id]
    );

    if (existingEvaluation && existingEvaluation.is_submitted) {
      return res.status(409).json({ error: 'Evaluation already submitted for this participant' });
    }

    const evaluationData = {
      participant_id,
      evaluator_id: req.user.id,
      introduction_marks: introduction_marks || 0,
      content_marks: content_marks || 0,
      conclusion_marks: conclusion_marks || 0,
      handwriting_marks: handwriting_marks || 0,
      grammar_marks: grammar_marks || 0,
      special_points: special_points || 0,
      comments: comments || '',
      is_submitted: true,
      submitted_at: new Date().toISOString()
    };

    if (existingEvaluation) {
      // Update existing evaluation
      await runQuery(
        `UPDATE evaluations SET 
         introduction_marks = ?, content_marks = ?, conclusion_marks = ?, 
         handwriting_marks = ?, grammar_marks = ?, special_points = ?, 
         comments = ?, is_submitted = 1, submitted_at = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          evaluationData.introduction_marks,
          evaluationData.content_marks,
          evaluationData.conclusion_marks,
          evaluationData.handwriting_marks,
          evaluationData.grammar_marks,
          evaluationData.special_points,
          evaluationData.comments,
          evaluationData.submitted_at,
          existingEvaluation.id
        ]
      );
    } else {
      // Create new evaluation
      await runQuery(
        `INSERT INTO evaluations 
         (participant_id, evaluator_id, introduction_marks, content_marks, 
          conclusion_marks, handwriting_marks, grammar_marks, special_points, 
          comments, is_submitted, submitted_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [
          evaluationData.participant_id,
          evaluationData.evaluator_id,
          evaluationData.introduction_marks,
          evaluationData.content_marks,
          evaluationData.conclusion_marks,
          evaluationData.handwriting_marks,
          evaluationData.grammar_marks,
          evaluationData.special_points,
          evaluationData.comments,
          evaluationData.submitted_at
        ]
      );
    }

    res.json({
      message: 'Evaluation submitted successfully',
      participant: {
        registration_number: participant.registration_number,
        full_name: participant.full_name
      }
    });
  } catch (error) {
    console.error('Submit evaluation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get evaluator's evaluations
router.get('/my-evaluations', authenticateToken, requireEvaluator, async (req, res) => {
  try {
    const { page = 1, limit = 50, status = 'all' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE e.evaluator_id = ?';
    let params = [req.user.id];

    if (status === 'submitted') {
      whereClause += ' AND e.is_submitted = 1';
    } else if (status === 'pending') {
      whereClause += ' AND e.is_submitted = 0';
    }

    const evaluations = await allQuery(
      `SELECT e.*, p.registration_number, p.full_name, p.gender
       FROM evaluations e
       JOIN participants p ON e.participant_id = p.id
       ${whereClause}
       ORDER BY e.updated_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Get total count
    const countResult = await getQuery(
      `SELECT COUNT(*) as total 
       FROM evaluations e 
       ${whereClause}`,
      params
    );

    res.json({
      evaluations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (error) {
    console.error('Get my evaluations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update evaluation (before submission)
router.put('/:evaluationId', [
  body('introduction_marks').optional().isInt({ min: 0, max: 10 }),
  body('content_marks').optional().isInt({ min: 0, max: 20 }),
  body('conclusion_marks').optional().isInt({ min: 0, max: 10 }),
  body('handwriting_marks').optional().isInt({ min: 0, max: 10 }),
  body('grammar_marks').optional().isInt({ min: 0, max: 10 }),
  body('special_points').optional().isInt({ min: 0, max: 10 }),
  body('comments').optional().isLength({ max: 1000 })
], authenticateToken, requireEvaluator, async (req, res) => {
  try {
    const { evaluationId } = req.params;
    const updates = req.body;

    // Check if evaluation exists and belongs to this evaluator
    const evaluation = await getQuery(
      'SELECT * FROM evaluations WHERE id = ? AND evaluator_id = ?',
      [evaluationId, req.user.id]
    );

    if (!evaluation) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }

    if (evaluation.is_submitted) {
      return res.status(400).json({ error: 'Cannot update submitted evaluation' });
    }

    // Build update query
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
    values.push(evaluationId);

    await runQuery(
      `UPDATE evaluations SET ${updateFields.join(', ')} WHERE id = ?`,
      values
    );

    const updatedEvaluation = await getQuery(
      'SELECT * FROM evaluations WHERE id = ?',
      [evaluationId]
    );

    res.json({
      message: 'Evaluation updated successfully',
      evaluation: updatedEvaluation
    });
  } catch (error) {
    console.error('Update evaluation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

