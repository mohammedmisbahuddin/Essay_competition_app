-- PostgreSQL schema for Essay Competition Management System

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'evaluator', 'invigilator')),
    full_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Participants table
CREATE TABLE IF NOT EXISTS participants (
    id SERIAL PRIMARY KEY,
    registration_number VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    age INTEGER,
    qualification VARCHAR(100),
    father_name VARCHAR(100),
    registration_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_spot_registration BOOLEAN DEFAULT FALSE
);

-- Evaluations table
CREATE TABLE IF NOT EXISTS evaluations (
    id SERIAL PRIMARY KEY,
    participant_id INTEGER REFERENCES participants(id) ON DELETE CASCADE,
    evaluator_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    introduction_marks INTEGER DEFAULT 0,
    content_marks INTEGER DEFAULT 0,
    conclusion_marks INTEGER DEFAULT 0,
    handwriting_marks INTEGER DEFAULT 0,
    grammar_marks INTEGER DEFAULT 0,
    special_points INTEGER DEFAULT 0,
    total_marks INTEGER GENERATED ALWAYS AS (
        introduction_marks + content_marks + conclusion_marks + 
        handwriting_marks + grammar_marks + special_points
    ) STORED,
    comments TEXT,
    is_submitted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Competition settings table
CREATE TABLE IF NOT EXISTS competition_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Google Sheets configuration table
CREATE TABLE IF NOT EXISTS google_sheets_config (
    id SERIAL PRIMARY KEY,
    sheet_id VARCHAR(100) NOT NULL,
    sheet_name VARCHAR(100) NOT NULL,
    credentials_json TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_participants_registration_number ON participants(registration_number);
CREATE INDEX IF NOT EXISTS idx_participants_email ON participants(email);
CREATE INDEX IF NOT EXISTS idx_evaluations_participant_id ON evaluations(participant_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_evaluator_id ON evaluations(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
