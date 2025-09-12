-- Migration script to update participants table to match actual CSV structure
-- This migration adds the new columns and removes old ones

-- First, let's create a backup of existing data
CREATE TABLE IF NOT EXISTS participants_backup AS SELECT * FROM participants;

-- Drop the old table and recreate with new structure
DROP TABLE IF EXISTS participants;

-- Create new participants table with correct structure
CREATE TABLE participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    registration_number VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    gender TEXT CHECK(gender IN ('male', 'female', 'other')) NOT NULL,
    age INTEGER,
    qualification VARCHAR(200),
    father_name VARCHAR(100),
    registration_timestamp DATETIME,
    is_spot_registration BOOLEAN DEFAULT 0,
    registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_participants_registration_number ON participants(registration_number);
CREATE INDEX IF NOT EXISTS idx_participants_gender ON participants(gender);
CREATE INDEX IF NOT EXISTS idx_participants_email ON participants(email);
CREATE INDEX IF NOT EXISTS idx_participants_phone ON participants(phone);

-- Insert default admin user if not exists
INSERT OR IGNORE INTO users (username, email, password_hash, role, full_name) 
VALUES ('admin', 'admin@competition.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'System Administrator');

-- Update competition settings to match new structure
INSERT OR IGNORE INTO competition_settings (setting_key, setting_value, description) VALUES
('competition_name', 'Essay Competition 2025', 'Name of the competition'),
('competition_date', '2025-01-15', 'Date of the competition'),
('registration_deadline', '2025-01-10', 'Registration deadline'),
('max_participants', '500', 'Maximum number of participants'),
('introduction_max', '10', 'Maximum marks for introduction'),
('content_max', '40', 'Maximum marks for content'),
('conclusion_max', '10', 'Maximum marks for conclusion'),
('handwriting_max', '10', 'Maximum marks for handwriting'),
('grammar_max', '10', 'Maximum marks for grammar and spelling'),
('special_points_max', '10', 'Maximum special points');
