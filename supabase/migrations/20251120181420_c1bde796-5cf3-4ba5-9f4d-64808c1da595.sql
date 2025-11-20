-- Migration: Add 'audio' to source_type CHECK constraint
-- This allows audio lectures to be stored in the study_notes table

-- Drop the existing CHECK constraint if it exists
ALTER TABLE study_notes
DROP CONSTRAINT IF EXISTS study_notes_sources_type_check;

-- Add the updated CHECK constraint with 'audio' included
ALTER TABLE study_notes
ADD CONSTRAINT study_notes_sources_type_check
CHECK (source_type IN ('pdf', 'docx', 'youtube', 'url', 'gdrive', 'audio'));

-- Add comment for documentation
COMMENT ON CONSTRAINT study_notes_sources_type_check ON study_notes IS
'Valid source types: pdf, docx, youtube, url, gdrive, audio';