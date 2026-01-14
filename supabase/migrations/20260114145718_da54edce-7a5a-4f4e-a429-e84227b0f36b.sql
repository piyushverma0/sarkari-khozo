-- Add missing created_at column to user_stats table
ALTER TABLE user_stats
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill existing records with joined_date value
UPDATE user_stats
SET created_at = joined_date
WHERE created_at IS NULL;