-- =====================================================
-- Add 'generating' to Processing Status Constraint
-- Allows AI-generated notes to use 'generating' status
-- =====================================================

-- Drop the existing CHECK constraint if it exists
ALTER TABLE study_notes
DROP CONSTRAINT IF EXISTS study_notes_processing_status_check;

-- Add the updated CHECK constraint with 'generating' included
ALTER TABLE study_notes
ADD CONSTRAINT study_notes_processing_status_check
CHECK (processing_status IN ('pending', 'extracting', 'summarizing', 'generating', 'completed', 'failed'));

-- Comment for documentation
COMMENT ON CONSTRAINT study_notes_processing_status_check ON study_notes IS 'Valid processing statuses: pending, extracting, summarizing, generating, completed, failed';