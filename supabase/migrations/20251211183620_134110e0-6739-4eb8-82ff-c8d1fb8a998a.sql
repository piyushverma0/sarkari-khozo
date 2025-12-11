-- Add cheat_code_blocks and has_cheat_codes columns to study_notes table
-- This enables the "Exam-Ready Memory Boosters" feature

-- Add cheat_code_blocks column (JSONB to store array of cheat code blocks)
ALTER TABLE study_notes
ADD COLUMN IF NOT EXISTS cheat_code_blocks JSONB DEFAULT NULL;

-- Add has_cheat_codes boolean flag for quick filtering
ALTER TABLE study_notes
ADD COLUMN IF NOT EXISTS has_cheat_codes BOOLEAN DEFAULT FALSE;

-- Create index on has_cheat_codes for faster queries
CREATE INDEX IF NOT EXISTS idx_study_notes_has_cheat_codes
ON study_notes(has_cheat_codes)
WHERE has_cheat_codes = TRUE;

-- Create GIN index on cheat_code_blocks for JSON queries (optional, for future enhancements)
CREATE INDEX IF NOT EXISTS idx_study_notes_cheat_code_blocks
ON study_notes USING GIN (cheat_code_blocks);

-- Add comment explaining the feature
COMMENT ON COLUMN study_notes.cheat_code_blocks IS
'Ultra-compressed memory hooks for exam preparation. JSON array of CheatCodeBlock objects with types like formula_sheet, article_list, ratio_tricks, one_liners, etc.';

COMMENT ON COLUMN study_notes.has_cheat_codes IS
'Flag indicating if this note has cheat-code blocks generated. Used for conditional UI rendering.';