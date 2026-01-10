-- =====================================================
-- Add AI Generated Source Type for UP Police Feature
-- Allows notes to be created by AI without file upload
-- =====================================================

-- Drop the existing CHECK constraint if it exists
ALTER TABLE study_notes
DROP CONSTRAINT IF EXISTS study_notes_sources_type_check;

-- Add the updated CHECK constraint with 'ai_generated' included
ALTER TABLE study_notes
ADD CONSTRAINT study_notes_sources_type_check
CHECK (source_type IN ('pdf', 'docx', 'youtube', 'url', 'gdrive', 'audio', 'ai_generated'));

-- Comment for documentation
COMMENT ON CONSTRAINT study_notes_sources_type_check ON study_notes IS 'Valid source types: pdf, docx, youtube, url, gdrive, audio, ai_generated';