-- Migration script to add new columns to participants table
-- Run this to update existing database with new fields

-- Add new columns to participants table
ALTER TABLE participants ADD COLUMN age INTEGER;
ALTER TABLE participants ADD COLUMN qualification VARCHAR(200);
ALTER TABLE participants ADD COLUMN father_name VARCHAR(100);
ALTER TABLE participants ADD COLUMN registration_timestamp DATETIME;

-- Remove old columns that are no longer needed
-- Note: SQLite doesn't support DROP COLUMN directly, so we'll keep them for now
-- ALTER TABLE participants DROP COLUMN date_of_birth;
-- ALTER TABLE participants DROP COLUMN institution;
-- ALTER TABLE participants DROP COLUMN address;
