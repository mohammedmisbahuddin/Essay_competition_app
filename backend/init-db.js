#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || process.env.PGHOST,
  port: process.env.DB_PORT || process.env.PGPORT || 5432,
  user: process.env.DB_USER || process.env.PGUSER,
  password: process.env.DB_PASSWORD || process.env.PGPASSWORD,
  database: process.env.DB_NAME || process.env.PGDATABASE,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

console.log('🗄️ Initializing Railway PostgreSQL Database...');
console.log('Config:', {
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  database: dbConfig.database,
  ssl: !!dbConfig.ssl
});

const pool = new Pool(dbConfig);

async function initializeDatabase() {
  let client;
  
  try {
    // Connect to database
    console.log('📡 Connecting to PostgreSQL...');
    client = await pool.connect();
    console.log('✅ Connected to PostgreSQL successfully');

    // Read schema file
    const schemaPath = path.join(__dirname, '../database/schema_postgres.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📋 Reading schema file...');
    console.log('Schema file size:', schema.length, 'characters');

    // Execute schema
    console.log('🚀 Executing database schema...');
    await client.query(schema);
    console.log('✅ Database schema executed successfully');

    // Verify tables were created
    console.log('🔍 Verifying tables...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📊 Tables created:', tablesResult.rows.map(row => row.table_name));

    // Create default admin user
    console.log('👤 Creating default admin user...');
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await client.query(`
      INSERT INTO users (username, email, password_hash, role, full_name, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (username) DO NOTHING
    `, ['admin', 'admin@example.com', hashedPassword, 'admin', 'System Administrator', true]);
    
    console.log('✅ Default admin user created (admin/admin123)');

    // Create evaluator user
    console.log('👤 Creating evaluator user...');
    const evaluatorPassword = await bcrypt.hash('evaluator123', 10);
    
    await client.query(`
      INSERT INTO users (username, email, password_hash, role, full_name, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (username) DO NOTHING
    `, ['evaluator', 'evaluator@example.com', evaluatorPassword, 'evaluator', 'Test Evaluator', true]);
    
    console.log('✅ Evaluator user created (evaluator/evaluator123)');

    // Insert competition settings
    console.log('⚙️ Setting up competition settings...');
    const settings = [
      ['max_introduction_marks', '10', 'Maximum marks for introduction'],
      ['max_content_marks', '20', 'Maximum marks for content'],
      ['max_conclusion_marks', '10', 'Maximum marks for conclusion'],
      ['max_handwriting_marks', '10', 'Maximum marks for handwriting'],
      ['max_grammar_marks', '10', 'Maximum marks for grammar'],
      ['max_special_points', '10', 'Maximum special points'],
      ['competition_name', 'Essay Competition 2025', 'Name of the competition'],
      ['competition_date', '2025-12-31', 'Competition date']
    ];

    for (const [key, value, description] of settings) {
      await client.query(`
        INSERT INTO competition_settings (setting_key, setting_value, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (setting_key) DO UPDATE SET
          setting_value = EXCLUDED.setting_value,
          description = EXCLUDED.description
      `, [key, value, description]);
    }
    
    console.log('✅ Competition settings configured');

    console.log('\n🎉 Database initialization completed successfully!');
    console.log('📊 Database is ready for the Essay Management System');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Run initialization
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('✅ Database initialization script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Database initialization script failed:', error);
      process.exit(1);
    });
}

module.exports = { initializeDatabase };
