-- Essay Competition Management Database Schema - PostgreSQL Version

-- Users table for system users (registration desk, invigilators, evaluators, admins)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role TEXT CHECK(role IN ('registration_desk', 'invigilator', 'evaluator', 'admin')) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Participants table for competition participants
CREATE TABLE IF NOT EXISTS participants (
    id SERIAL PRIMARY KEY,
    registration_number VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    gender TEXT CHECK(gender IN ('male', 'female', 'other')) NOT NULL,
    age INTEGER,
    qualification VARCHAR(200),
    father_name VARCHAR(100),
    registration_timestamp TIMESTAMP,
    is_spot_registration BOOLEAN DEFAULT false,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    attendance_marked BOOLEAN DEFAULT false,
    attendance_marked_at TIMESTAMP
);

-- Evaluations table for storing evaluation scores
CREATE TABLE IF NOT EXISTS evaluations (
    id SERIAL PRIMARY KEY,
    participant_id INTEGER NOT NULL,
    evaluator_id INTEGER NOT NULL,
    introduction_marks INTEGER CHECK (introduction_marks >= 0 AND introduction_marks <= 50),
    content_marks INTEGER CHECK (content_marks >= 0 AND content_marks <= 100),
    conclusion_marks INTEGER CHECK (conclusion_marks >= 0 AND conclusion_marks <= 50),
    handwriting_marks INTEGER CHECK (handwriting_marks >= 0 AND handwriting_marks <= 50),
    grammar_marks INTEGER CHECK (grammar_marks >= 0 AND grammar_marks <= 50),
    special_points INTEGER CHECK (special_points >= 0 AND special_points <= 50),
    total_marks INTEGER GENERATED ALWAYS AS (
        COALESCE(introduction_marks, 0) + 
        COALESCE(content_marks, 0) + 
        COALESCE(conclusion_marks, 0) + 
        COALESCE(handwriting_marks, 0) + 
        COALESCE(grammar_marks, 0) + 
        COALESCE(special_points, 0)
    ) STORED,
    comments TEXT,
    is_submitted BOOLEAN DEFAULT false,
    submitted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
    FOREIGN KEY (evaluator_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(participant_id, evaluator_id)
);

-- Competition settings table
CREATE TABLE IF NOT EXISTS competition_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(50) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Google Sheets configuration table
CREATE TABLE IF NOT EXISTS google_sheets_config (
    id SERIAL PRIMARY KEY,
    sheet_url VARCHAR(500) NOT NULL,
    sheet_id VARCHAR(100),
    range VARCHAR(50) DEFAULT 'A:Z',
    last_sync TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin user (password: admin123)
INSERT INTO users (username, email, password_hash, role, full_name) 
VALUES ('admin', 'admin@competition.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'System Administrator')
ON CONFLICT (username) DO NOTHING;

-- Insert default competition settings
INSERT INTO competition_settings (setting_key, setting_value, description) VALUES
('competition_name', 'Essay Competition 2025', 'Name of the competition'),
('competition_date', '2025-01-15', 'Date of the competition'),
('registration_deadline', '2025-01-10', 'Registration deadline'),
('max_participants', '500', 'Maximum number of participants'),
('introduction_max', '10', 'Maximum marks for introduction'),
('content_max', '40', 'Maximum marks for content'),
('conclusion_max', '10', 'Maximum marks for conclusion'),
('handwriting_max', '10', 'Maximum marks for handwriting'),
('grammar_max', '10', 'Maximum marks for grammar and spelling'),
('special_points_max', '10', 'Maximum special points'),
('max_introduction_marks', '10', 'Maximum marks for introduction'),
('max_content_marks', '20', 'Maximum marks for content'),
('max_conclusion_marks', '10', 'Maximum marks for conclusion'),
('max_handwriting_marks', '10', 'Maximum marks for handwriting'),
('max_grammar_marks', '10', 'Maximum marks for grammar and spelling'),
('max_special_points', '10', 'Maximum special points'),
('total_max_marks', '70', 'Total maximum marks possible')
ON CONFLICT (setting_key) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_participants_registration_number ON participants(registration_number);
CREATE INDEX IF NOT EXISTS idx_participants_gender ON participants(gender);
CREATE INDEX IF NOT EXISTS idx_participants_full_name ON participants(full_name);
CREATE INDEX IF NOT EXISTS idx_participants_email ON participants(email);
CREATE INDEX IF NOT EXISTS idx_evaluations_participant_id ON evaluations(participant_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_evaluator_id ON evaluations(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_total_marks ON evaluations(total_marks);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_participants_updated_at ON participants;
CREATE TRIGGER update_participants_updated_at BEFORE UPDATE ON participants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_evaluations_updated_at ON evaluations;
CREATE TRIGGER update_evaluations_updated_at BEFORE UPDATE ON evaluations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_competition_settings_updated_at ON competition_settings;
CREATE TRIGGER update_competition_settings_updated_at BEFORE UPDATE ON competition_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_google_sheets_config_updated_at ON google_sheets_config;
CREATE TRIGGER update_google_sheets_config_updated_at BEFORE UPDATE ON google_sheets_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
