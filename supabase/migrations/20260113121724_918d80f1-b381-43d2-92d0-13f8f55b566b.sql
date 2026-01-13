-- Migration: Add status column to onboarding_preferences table
-- Date: 2026-01-13
-- Description: Adds status tracking for onboarding (completed/skipped)

-- Add status column to track whether user completed or skipped onboarding
ALTER TABLE onboarding_preferences
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT NULL;

-- Add check constraint to ensure status is either 'completed' or 'skipped'
ALTER TABLE onboarding_preferences
ADD CONSTRAINT onboarding_status_check
CHECK (status IN ('completed', 'skipped'));

-- Make existing preference fields nullable for skip functionality
ALTER TABLE onboarding_preferences
ALTER COLUMN profile_type DROP NOT NULL,
ALTER COLUMN exam_goals DROP NOT NULL,
ALTER COLUMN education_level DROP NOT NULL,
ALTER COLUMN daily_study_hours DROP NOT NULL,
ALTER COLUMN target_timeline DROP NOT NULL,
ALTER COLUMN subject_interests DROP NOT NULL,
ALTER COLUMN preferred_language DROP NOT NULL,
ALTER COLUMN completed_at DROP NOT NULL;

-- Add index on status for faster queries
CREATE INDEX IF NOT EXISTS idx_onboarding_preferences_status
ON onboarding_preferences(status);

-- Update existing records to have 'completed' status
UPDATE onboarding_preferences
SET status = 'completed'
WHERE status IS NULL AND completed_at IS NOT NULL;

-- Add comment explaining the status column
COMMENT ON COLUMN onboarding_preferences.status IS 'Tracks whether user completed or skipped onboarding. Values: completed, skipped';