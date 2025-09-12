#!/usr/bin/env node

/**
 * Migration Script: SQLite to PostgreSQL
 * 
 * This script migrates data from SQLite to PostgreSQL
 * Run this after setting up PostgreSQL database
 */

const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// Configuration
const SQLITE_DB_PATH = process.env.SQLITE_DB_PATH || path.join(__dirname, '../backend/database/competition.db');
const POSTGRES_URL = process.env.DATABASE_URL;

if (!POSTGRES_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

// Initialize connections
const sqliteDb = new sqlite3.Database(SQLITE_DB_PATH);
const pgPool = new Pool({
  connectionString: POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Migration functions
const migrateUsers = async () => {
  console.log('📦 Migrating users...');
  
  return new Promise((resolve, reject) => {
    sqliteDb.all('SELECT * FROM users', async (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      try {
        for (const user of rows) {
          await pgPool.query(`
            INSERT INTO users (id, username, email, password_hash, role, full_name, is_active, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (id) DO UPDATE SET
              username = EXCLUDED.username,
              email = EXCLUDED.email,
              password_hash = EXCLUDED.password_hash,
              role = EXCLUDED.role,
              full_name = EXCLUDED.full_name,
              is_active = EXCLUDED.is_active,
              updated_at = CURRENT_TIMESTAMP
          `, [
            user.id, user.username, user.email, user.password_hash,
            user.role, user.full_name, user.is_active, user.created_at, user.updated_at
          ]);
        }
        
        console.log(`✅ Migrated ${rows.length} users`);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
};

const migrateParticipants = async () => {
  console.log('📦 Migrating participants...');
  
  return new Promise((resolve, reject) => {
    sqliteDb.all('SELECT * FROM participants', async (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      try {
        for (const participant of rows) {
          await pgPool.query(`
            INSERT INTO participants (
              id, registration_number, full_name, email, phone, gender, age,
              qualification, father_name, registration_timestamp, is_spot_registration,
              registration_date, created_at, updated_at, attendance_marked, attendance_marked_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            ON CONFLICT (id) DO UPDATE SET
              registration_number = EXCLUDED.registration_number,
              full_name = EXCLUDED.full_name,
              email = EXCLUDED.email,
              phone = EXCLUDED.phone,
              gender = EXCLUDED.gender,
              age = EXCLUDED.age,
              qualification = EXCLUDED.qualification,
              father_name = EXCLUDED.father_name,
              registration_timestamp = EXCLUDED.registration_timestamp,
              is_spot_registration = EXCLUDED.is_spot_registration,
              updated_at = CURRENT_TIMESTAMP
          `, [
            participant.id, participant.registration_number, participant.full_name,
            participant.email, participant.phone, participant.gender, participant.age,
            participant.qualification, participant.father_name, participant.registration_timestamp,
            participant.is_spot_registration, participant.registration_date,
            participant.created_at, participant.updated_at,
            participant.attendance_marked || false, participant.attendance_marked_at
          ]);
        }
        
        console.log(`✅ Migrated ${rows.length} participants`);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
};

const migrateEvaluations = async () => {
  console.log('📦 Migrating evaluations...');
  
  return new Promise((resolve, reject) => {
    sqliteDb.all('SELECT * FROM evaluations', async (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      try {
        for (const evaluation of rows) {
          await pgPool.query(`
            INSERT INTO evaluations (
              id, participant_id, evaluator_id, introduction_marks, content_marks,
              conclusion_marks, handwriting_marks, grammar_marks, special_points,
              comments, is_submitted, submitted_at, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (id) DO UPDATE SET
              participant_id = EXCLUDED.participant_id,
              evaluator_id = EXCLUDED.evaluator_id,
              introduction_marks = EXCLUDED.introduction_marks,
              content_marks = EXCLUDED.content_marks,
              conclusion_marks = EXCLUDED.conclusion_marks,
              handwriting_marks = EXCLUDED.handwriting_marks,
              grammar_marks = EXCLUDED.grammar_marks,
              special_points = EXCLUDED.special_points,
              comments = EXCLUDED.comments,
              is_submitted = EXCLUDED.is_submitted,
              submitted_at = EXCLUDED.submitted_at,
              updated_at = CURRENT_TIMESTAMP
          `, [
            evaluation.id, evaluation.participant_id, evaluation.evaluator_id,
            evaluation.introduction_marks, evaluation.content_marks, evaluation.conclusion_marks,
            evaluation.handwriting_marks, evaluation.grammar_marks, evaluation.special_points,
            evaluation.comments, evaluation.is_submitted, evaluation.submitted_at,
            evaluation.created_at, evaluation.updated_at
          ]);
        }
        
        console.log(`✅ Migrated ${rows.length} evaluations`);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
};

const migrateSettings = async () => {
  console.log('📦 Migrating competition settings...');
  
  return new Promise((resolve, reject) => {
    sqliteDb.all('SELECT * FROM competition_settings', async (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      try {
        for (const setting of rows) {
          await pgPool.query(`
            INSERT INTO competition_settings (id, setting_key, setting_value, description, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (id) DO UPDATE SET
              setting_key = EXCLUDED.setting_key,
              setting_value = EXCLUDED.setting_value,
              description = EXCLUDED.description,
              updated_at = CURRENT_TIMESTAMP
          `, [
            setting.id, setting.setting_key, setting.setting_value,
            setting.description, setting.created_at, setting.updated_at
          ]);
        }
        
        console.log(`✅ Migrated ${rows.length} settings`);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
};

const migrateGoogleSheetsConfig = async () => {
  console.log('📦 Migrating Google Sheets config...');
  
  return new Promise((resolve, reject) => {
    sqliteDb.all('SELECT * FROM google_sheets_config', async (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      try {
        for (const config of rows) {
          await pgPool.query(`
            INSERT INTO google_sheets_config (
              id, sheet_url, sheet_id, range, last_sync, is_active, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (id) DO UPDATE SET
              sheet_url = EXCLUDED.sheet_url,
              sheet_id = EXCLUDED.sheet_id,
              range = EXCLUDED.range,
              last_sync = EXCLUDED.last_sync,
              is_active = EXCLUDED.is_active,
              updated_at = CURRENT_TIMESTAMP
          `, [
            config.id, config.sheet_url, config.sheet_id, config.range,
            config.last_sync, config.is_active, config.created_at, config.updated_at
          ]);
        }
        
        console.log(`✅ Migrated ${rows.length} Google Sheets configs`);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
};

// Main migration function
const runMigration = async () => {
  try {
    console.log('🚀 Starting SQLite to PostgreSQL migration...');
    console.log(`📁 SQLite DB: ${SQLITE_DB_PATH}`);
    console.log(`🐘 PostgreSQL URL: ${POSTGRES_URL.replace(/\/\/.*@/, '//***@')}`);
    
    // Check if SQLite database exists
    if (!fs.existsSync(SQLITE_DB_PATH)) {
      console.log('⚠️  SQLite database not found, skipping data migration');
      console.log('✅ Migration completed (schema only)');
      return;
    }
    
    // Test PostgreSQL connection
    const client = await pgPool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ PostgreSQL connection successful');
    
    // Run migrations
    await migrateUsers();
    await migrateParticipants();
    await migrateEvaluations();
    await migrateSettings();
    await migrateGoogleSheetsConfig();
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // Close connections
    sqliteDb.close();
    await pgPool.end();
  }
};

// Run migration if called directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
