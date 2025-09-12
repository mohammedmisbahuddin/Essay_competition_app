-- Migration script to add attendance tracking columns to participants table

-- Add attendance tracking columns
ALTER TABLE participants ADD COLUMN attendance_marked BOOLEAN DEFAULT 0;
ALTER TABLE participants ADD COLUMN attendance_marked_at DATETIME;
