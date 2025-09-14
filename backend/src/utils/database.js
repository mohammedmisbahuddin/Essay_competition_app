const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// Database configuration
const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'essay_competition',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

let pool;

const initializeDatabase = async () => {
  try {
    // Create connection pool
    pool = new Pool(dbConfig);
    
    // Test connection
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL database');
    
    // Read and execute PostgreSQL schema
    const schemaPath = path.join(__dirname, '../../../database/schema_postgres.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema
    await client.query(schema);
    console.log('✅ Database schema initialized');
    
    client.release();
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

const getDatabase = () => {
  if (!pool) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return pool;
};

const closeDatabase = async () => {
  if (pool) {
    await pool.end();
    console.log('✅ Database connection closed');
  }
};

// Convert SQLite-style placeholders (?) to PostgreSQL placeholders ($1, $2, etc.)
const convertPlaceholders = (sql, params = []) => {
  let paramIndex = 1;
  return sql.replace(/\?/g, () => `$${paramIndex++}`);
};

// Helper function for running queries
const runQuery = async (sql, params = []) => {
  const client = await pool.connect();
  try {
    const convertedSql = convertPlaceholders(sql, params);
    const result = await client.query(convertedSql, params);
    return { 
      id: result.rows[0]?.id || result.insertId, 
      changes: result.rowCount,
      rows: result.rows 
    };
  } finally {
    client.release();
  }
};

// Helper function for getting single row
const getQuery = async (sql, params = []) => {
  const client = await pool.connect();
  try {
    const convertedSql = convertPlaceholders(sql, params);
    const result = await client.query(convertedSql, params);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
};

// Helper function for getting multiple rows
const allQuery = async (sql, params = []) => {
  const client = await pool.connect();
  try {
    const convertedSql = convertPlaceholders(sql, params);
    const result = await client.query(convertedSql, params);
    return result.rows;
  } finally {
    client.release();
  }
};

// Convert SQLite schema to PostgreSQL
const convertSqliteToPostgres = (sqliteSchema) => {
  return sqliteSchema
    // Replace SQLite specific syntax with PostgreSQL
    .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY')
    .replace(/INTEGER/g, 'INTEGER')
    .replace(/VARCHAR\((\d+)\)/g, 'VARCHAR($1)')
    .replace(/TEXT CHECK\(/g, 'TEXT CHECK (')
    .replace(/BOOLEAN DEFAULT (\d+)/g, (match, value) => `BOOLEAN DEFAULT ${value === '1' ? 'TRUE' : 'FALSE'}`)
    .replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/g, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
    .replace(/CURRENT_TIMESTAMP/g, 'CURRENT_TIMESTAMP')
    .replace(/INSERT OR IGNORE INTO/g, 'INSERT INTO')
    .replace(/ON DELETE CASCADE/g, 'ON DELETE CASCADE')
    .replace(/CREATE INDEX IF NOT EXISTS/g, 'CREATE INDEX IF NOT EXISTS')
    .replace(/GENERATED ALWAYS AS \(/g, 'GENERATED ALWAYS AS (')
    .replace(/STORED/g, 'STORED')
    // Handle the computed column for total_marks
    .replace(/total_marks INTEGER GENERATED ALWAYS AS \(\s*COALESCE\(introduction_marks, 0\) \+\s*COALESCE\(content_marks, 0\) \+\s*COALESCE\(conclusion_marks, 0\) \+\s*COALESCE\(handwriting_marks, 0\) \+\s*COALESCE\(grammar_marks, 0\) \+\s*COALESCE\(special_points, 0\)\s*\) STORED/g, 
      'total_marks INTEGER GENERATED ALWAYS AS (COALESCE(introduction_marks, 0) + COALESCE(content_marks, 0) + COALESCE(conclusion_marks, 0) + COALESCE(handwriting_marks, 0) + COALESCE(grammar_marks, 0) + COALESCE(special_points, 0)) STORED');
};

module.exports = {
  initializeDatabase,
  getDatabase,
  closeDatabase,
  runQuery,
  getQuery,
  allQuery
};