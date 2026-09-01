const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection configuration
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
};

let pool;

const initializeDatabase = async () => {
  try {
    pool = new Pool(dbConfig);
    
    // Test the connection
    const client = await pool.connect();
    console.log('Connected to PostgreSQL database');
    
    // Read and execute schema
    const schemaPath = path.join(__dirname, '../../../database/schema-postgresql.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await client.query(schema);
    console.log('Database schema initialized');
    
    client.release();
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

const getPool = () => {
  if (!pool) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return pool;
};

const closeDatabase = async () => {
  if (pool) {
    await pool.end();
    console.log('Database connection pool closed');
  }
};

const normalizeQuery = (sql) => {
  let parameterIndex = 0;
  let normalizedSql = sql.replace(/\?/g, () => `$${++parameterIndex}`);

  if (/^\s*INSERT\s+INTO\s+/i.test(normalizedSql) && !/\bRETURNING\b/i.test(normalizedSql)) {
    normalizedSql = `${normalizedSql.trim()} RETURNING id`;
  }

  return normalizedSql;
};

// Helper function for running queries
const runQuery = async (sql, params = []) => {
  const client = await pool.connect();
  try {
    const result = await client.query(normalizeQuery(sql), params);
    return { 
      id: result.rows[0]?.id || result.insertId || null, 
      lastID: result.rows[0]?.id || result.insertId || null,
      changes: result.rowCount || 0,
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
    const result = await client.query(normalizeQuery(sql), params);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
};

// Helper function for getting multiple rows
const allQuery = async (sql, params = []) => {
  const client = await pool.connect();
  try {
    const result = await client.query(normalizeQuery(sql), params);
    return result.rows;
  } finally {
    client.release();
  }
};

// Helper function for transactions
const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  initializeDatabase,
  getPool,
  closeDatabase,
  runQuery,
  getQuery,
  allQuery,
  transaction
};
