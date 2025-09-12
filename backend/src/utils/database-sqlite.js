// Database connection switcher - supports both SQLite and PostgreSQL
const fs = require('fs');
const path = require('path');

// Determine which database to use based on environment
const usePostgreSQL = process.env.DATABASE_URL && process.env.NODE_ENV === 'production';

let databaseModule;

if (usePostgreSQL) {
  console.log('🐘 Using PostgreSQL database');
  databaseModule = require('./database-postgresql');
} else {
  console.log('📁 Using SQLite database');
  databaseModule = require('./database-sqlite');
}

module.exports = databaseModule;