-- Add recall_questions columns to study_notes table
-- Enables "Recall Mode" (Active Brain Testing) feature

-- Add recall_questions column (JSONB array of questions)
ALTER TABLE study_notes
ADD COLUMN IF NOT EXISTS recall_questions JSONB DEFAULT NULL;

-- Add has_recall_questions boolean flag for conditional UI rendering
ALTER TABLE study_notes
ADD COLUMN IF NOT EXISTS has_recall_questions BOOLEAN DEFAULT FALSE;

-- Add timestamp for when questions were generated
ALTER TABLE study_notes
ADD COLUMN IF NOT EXISTS recall_questions_generated_at TIMESTAMPTZ;

-- Create index on has_recall_questions for faster queries
CREATE INDEX IF NOT EXISTS idx_study_notes_has_recall_questions
ON study_notes(has_recall_questions)
WHERE has_recall_questions = TRUE;

-- Create GIN index on recall_questions for JSON queries (for analytics)
CREATE INDEX IF NOT EXISTS idx_study_notes_recall_questions
ON study_notes USING GIN (recall_questions);

-- Add comments explaining the feature
COMMENT ON COLUMN study_notes.recall_questions IS
'Active recall questions inserted at strategic points in notes. Includes fill-in-blanks, true/false, MCQs, and connect-the-dots questions for testing comprehension.';

COMMENT ON COLUMN study_notes.has_recall_questions IS
'Flag indicating if this note has recall questions generated. Used for conditional UI rendering.';

COMMENT ON COLUMN study_notes.recall_questions_generated_at IS
'Timestamp when recall questions were generated for this note.';