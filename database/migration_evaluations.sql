-- Migration script to update evaluations table constraints
-- Fix content_marks constraint to allow up to 40 marks

-- Create new evaluations table with correct constraints
CREATE TABLE evaluations_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    participant_id INTEGER NOT NULL,
    evaluator_id INTEGER NOT NULL,
    introduction_marks INTEGER CHECK (introduction_marks >= 0 AND introduction_marks <= 10),
    content_marks INTEGER CHECK (content_marks >= 0 AND content_marks <= 40),
    conclusion_marks INTEGER CHECK (conclusion_marks >= 0 AND conclusion_marks <= 10),
    handwriting_marks INTEGER CHECK (handwriting_marks >= 0 AND handwriting_marks <= 10),
    grammar_marks INTEGER CHECK (grammar_marks >= 0 AND grammar_marks <= 10),
    special_points INTEGER CHECK (special_points >= 0 AND special_points <= 20),
    total_marks INTEGER GENERATED ALWAYS AS (
        COALESCE(introduction_marks, 0) + 
        COALESCE(content_marks, 0) + 
        COALESCE(conclusion_marks, 0) + 
        COALESCE(handwriting_marks, 0) + 
        COALESCE(grammar_marks, 0) + 
        COALESCE(special_points, 0)
    ) STORED,
    comments TEXT,
    is_submitted BOOLEAN DEFAULT 0,
    submitted_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
    FOREIGN KEY (evaluator_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(participant_id, evaluator_id)
);

-- Copy data from old table to new table
INSERT INTO evaluations_new 
(id, participant_id, evaluator_id, introduction_marks, content_marks, conclusion_marks, 
 handwriting_marks, grammar_marks, special_points, comments, is_submitted, submitted_at, created_at, updated_at)
SELECT id, participant_id, evaluator_id, introduction_marks, content_marks, conclusion_marks, 
       handwriting_marks, grammar_marks, special_points, comments, is_submitted, submitted_at, created_at, updated_at
FROM evaluations;

-- Drop old table
DROP TABLE evaluations;

-- Rename new table
ALTER TABLE evaluations_new RENAME TO evaluations;

-- Recreate indexes
CREATE INDEX idx_evaluations_participant_id ON evaluations(participant_id);
CREATE INDEX idx_evaluations_evaluator_id ON evaluations(evaluator_id);
CREATE INDEX idx_evaluations_total_marks ON evaluations(total_marks);
