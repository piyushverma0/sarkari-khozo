-- =====================================================
-- Add Category and Subject Columns for UP Police Feature
-- These columns support categorization of AI-generated notes
-- =====================================================

-- Add category column (for exam types like "UP Police 2026")
ALTER TABLE study_notes
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT NULL;

-- Add subject column (for subjects like "General Knowledge", "General Hindi")
ALTER TABLE study_notes
ADD COLUMN IF NOT EXISTS subject TEXT DEFAULT NULL;

-- Create index on category for faster filtering
CREATE INDEX IF NOT EXISTS idx_study_notes_category ON study_notes(category);

-- Create index on subject for faster filtering
CREATE INDEX IF NOT EXISTS idx_study_notes_subject ON study_notes(subject);

-- Create composite index for category + subject queries
CREATE INDEX IF NOT EXISTS idx_study_notes_category_subject ON study_notes(category, subject);

-- Comments for documentation
COMMENT ON COLUMN study_notes.category IS 'Exam category or type (e.g., "UP Police 2026", "SSC CGL 2026")';
COMMENT ON COLUMN study_notes.subject IS 'Subject name (e.g., "General Knowledge", "General Hindi", "Mathematics")';