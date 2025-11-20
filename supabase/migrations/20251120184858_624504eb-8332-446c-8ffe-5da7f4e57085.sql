-- Drop the old constraint that's blocking audio inserts
ALTER TABLE study_notes
DROP CONSTRAINT IF EXISTS study_notes_source_type_check;