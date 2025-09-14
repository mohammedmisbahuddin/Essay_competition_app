#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Railway PostgreSQL configuration - using external URL
const dbConfig = {
  connectionString: 'postgresql://postgres:zRiUwAAXIgDcWykrNLZEFKtGpgbqlvjj@metro.proxy.rlwy.net:17709/railway',
  ssl: { rejectUnauthorized: false }
};

console.log('🚀 Initializing Railway PostgreSQL Database...');
console.log('Config:', {
  connectionString: 'postgresql://postgres:***@metro.proxy.rlwy.net:17709/railway',
  ssl: !!dbConfig.ssl
});

const pool = new Pool(dbConfig);

async function initializeDatabase() {
  let client;
  
  try {
    // Connect to database
    console.log('📡 Connecting to Railway PostgreSQL...');
    client = await pool.connect();
    console.log('✅ Connected to Railway PostgreSQL successfully');

    // Read schema file
    const schemaPath = path.join(__dirname, 'database/schema_postgres.sql');
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

    // Test database functionality
    console.log('🧪 Testing database functionality...');
    
    // Test users table
    const userCount = await client.query('SELECT COUNT(*) as count FROM users');
    console.log(`   Users in database: ${userCount.rows[0].count}`);
    
    // Test participants table
    const participantCount = await client.query('SELECT COUNT(*) as count FROM participants');
    console.log(`   Participants in database: ${participantCount.rows[0].count}`);
    
    // Test settings table
    const settingsCount = await client.query('SELECT COUNT(*) as count FROM competition_settings');
    console.log(`   Settings in database: ${settingsCount.rows[0].count}`);

    console.log('\n🎉 Railway PostgreSQL database initialization completed successfully!');
    console.log('📊 Database is ready for the Essay Management System');
    console.log('\n📋 Default Login Credentials:');
    console.log('   Admin: admin / admin123');
    console.log('   Evaluator: evaluator / evaluator123');
    
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
