const express = require('express');
const { google } = require('googleapis');
const { body, validationResult } = require('express-validator');
const { getQuery, runQuery, allQuery } = require('../utils/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { cleanParticipantData, generateRegistrationNumber } = require('../utils/helpers');

const router = express.Router();

// Configure Google Sheets API
const getGoogleSheetsClient = () => {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SHEETS_KEY_FILE, // Path to service account key file
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });

  return google.sheets({ version: 'v4', auth });
};

// Alternative method using API key (for public sheets)
const getGoogleSheetsClientWithAPIKey = () => {
  return google.sheets({ 
    version: 'v4', 
    auth: process.env.GOOGLE_SHEETS_API_KEY 
  });
};

// Configure Google Sheets URL
router.post('/configure', [
  body('sheet_url').isURL().withMessage('Valid Google Sheets URL is required'),
  body('range').optional().isString().withMessage('Range must be a string')
], authenticateToken, requireAdmin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { sheet_url, range = 'A:Z' } = req.body;

    // Extract sheet ID from URL
    const sheetIdMatch = sheet_url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!sheetIdMatch) {
      return res.status(400).json({ error: 'Invalid Google Sheets URL format' });
    }

    const sheetId = sheetIdMatch[1];

    // Save configuration
    await runQuery(
      `INSERT OR REPLACE INTO google_sheets_config (id, sheet_url, sheet_id, range, is_active) 
       VALUES (1, ?, ?, ?, 1)`,
      [sheet_url, sheetId, range]
    );

    res.json({ 
      message: 'Google Sheets configuration saved successfully',
      sheet_id: sheetId
    });
  } catch (error) {
    console.error('Configure Google Sheets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sync participants from Google Sheets
router.post('/sync', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Get Google Sheets configuration
    const config = await getQuery(
      'SELECT * FROM google_sheets_config WHERE is_active = 1 ORDER BY id DESC LIMIT 1'
    );

    if (!config) {
      return res.status(400).json({ error: 'Google Sheets not configured. Please configure first.' });
    }

    let sheets;
    try {
      // Try with service account first, then fallback to API key
      if (process.env.GOOGLE_SHEETS_KEY_FILE) {
        sheets = getGoogleSheetsClient();
      } else {
        sheets = getGoogleSheetsClientWithAPIKey();
      }
    } catch (error) {
      return res.status(500).json({ 
        error: 'Failed to initialize Google Sheets client. Please check your configuration.' 
      });
    }

    // Read data from Google Sheets
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: config.sheet_id,
      range: config.range
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return res.status(400).json({ error: 'No data found in the specified range' });
    }

    // Clean and validate data
    const cleanedData = cleanParticipantData(rows.slice(1)); // Skip header row

    if (cleanedData.length === 0) {
      return res.status(400).json({ error: 'No valid participant data found after cleaning' });
    }

    // Process participants
    const results = {
      total: cleanedData.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    for (const participantData of cleanedData) {
      try {
        // Check if participant already exists (by email or phone)
        let existingParticipant = null;
        
        if (participantData.email) {
          existingParticipant = await getQuery(
            'SELECT id FROM participants WHERE email = ?',
            [participantData.email]
          );
        }
        
        if (!existingParticipant && participantData.phone) {
          existingParticipant = await getQuery(
            'SELECT id FROM participants WHERE phone = ?',
            [participantData.phone]
          );
        }

        if (existingParticipant) {
          // Update existing participant
          await runQuery(
            `UPDATE participants SET 
             full_name = ?, gender = ?, date_of_birth = ?, 
             institution = ?, address = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
              participantData.full_name,
              participantData.gender,
              participantData.date_of_birth,
              participantData.institution,
              participantData.address,
              existingParticipant.id
            ]
          );
          results.updated++;
        } else {
          // Create new participant
          const registrationNumber = await generateRegistrationNumber();
          
          await runQuery(
            `INSERT INTO participants 
             (registration_number, full_name, email, phone, gender, 
              date_of_birth, institution, address, is_spot_registration) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
            [
              registrationNumber,
              participantData.full_name,
              participantData.email,
              participantData.phone,
              participantData.gender,
              participantData.date_of_birth,
              participantData.institution,
              participantData.address
            ]
          );
          results.created++;
        }
      } catch (error) {
        console.error('Error processing participant:', participantData, error);
        results.skipped++;
        results.errors.push({
          participant: participantData.full_name,
          error: error.message
        });
      }
    }

    // Update last sync time
    await runQuery(
      'UPDATE google_sheets_config SET last_sync = CURRENT_TIMESTAMP WHERE id = ?',
      [config.id]
    );

    res.json({
      message: 'Sync completed successfully',
      results
    });
  } catch (error) {
    console.error('Sync Google Sheets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get sync status
router.get('/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const config = await getQuery(
      'SELECT * FROM google_sheets_config WHERE is_active = 1 ORDER BY id DESC LIMIT 1'
    );

    if (!config) {
      return res.status(404).json({ error: 'Google Sheets not configured' });
    }

    // Get participant count
    const participantCount = await getQuery('SELECT COUNT(*) as count FROM participants');
    const spotRegistrationCount = await getQuery(
      'SELECT COUNT(*) as count FROM participants WHERE is_spot_registration = 1'
    );

    res.json({
      configuration: {
        sheet_url: config.sheet_url,
        sheet_id: config.sheet_id,
        range: config.range,
        last_sync: config.last_sync
      },
      statistics: {
        total_participants: participantCount.count,
        spot_registrations: spotRegistrationCount.count,
        imported_participants: participantCount.count - spotRegistrationCount.count
      }
    });
  } catch (error) {
    console.error('Get sync status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test Google Sheets connection
router.post('/test', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { sheet_url, range = 'A:Z' } = req.body;

    if (!sheet_url) {
      return res.status(400).json({ error: 'Sheet URL is required' });
    }

    // Extract sheet ID
    const sheetIdMatch = sheet_url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!sheetIdMatch) {
      return res.status(400).json({ error: 'Invalid Google Sheets URL format' });
    }

    const sheetId = sheetIdMatch[1];

    let sheets;
    try {
      if (process.env.GOOGLE_SHEETS_KEY_FILE) {
        sheets = getGoogleSheetsClient();
      } else {
        sheets = getGoogleSheetsClientWithAPIKey();
      }
    } catch (error) {
      return res.status(500).json({ 
        error: 'Failed to initialize Google Sheets client' 
      });
    }

    // Try to read a small range
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: range.split(':')[0] + ':1' // Just first row
    });

    const rows = response.data.values;
    const headers = rows && rows.length > 0 ? rows[0] : [];

    res.json({
      success: true,
      message: 'Connection successful',
      headers: headers,
      preview_rows: rows ? rows.slice(0, 3) : []
    });
  } catch (error) {
    console.error('Test Google Sheets error:', error);
    res.status(500).json({ 
      error: 'Failed to connect to Google Sheets',
      details: error.message
    });
  }
});

module.exports = router;

