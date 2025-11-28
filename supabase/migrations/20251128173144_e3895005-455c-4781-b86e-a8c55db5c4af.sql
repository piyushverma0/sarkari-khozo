-- ============================================================
-- NOTIFICATION SYSTEM SETUP (SAFE VERSION - HANDLES EXISTING OBJECTS)
-- ============================================================

-- ============================================================
-- STEP 1: Enable Required Extensions
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- ============================================================
-- STEP 2: Add notified columns to discovery_stories
-- ============================================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='discovery_stories' AND column_name='notified') THEN
        ALTER TABLE discovery_stories ADD COLUMN notified BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='discovery_stories' AND column_name='last_notified_at') THEN
        ALTER TABLE discovery_stories ADD COLUMN last_notified_at TIMESTAMPTZ;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_discovery_stories_notified
ON discovery_stories(notified, published_date DESC, relevance_score DESC)
WHERE notified = FALSE;

CREATE INDEX IF NOT EXISTS idx_discovery_stories_last_notified
ON discovery_stories(last_notified_at, relevance_score DESC)
WHERE last_notified_at IS NOT NULL;

-- ============================================================
-- STEP 3: Create user_daily_notification_count table
-- ============================================================

CREATE TABLE IF NOT EXISTS user_daily_notification_count (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_user_daily_notification_count_user_date
ON user_daily_notification_count(user_id, date);

-- Enable RLS
ALTER TABLE user_daily_notification_count ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policy to avoid conflicts
DROP POLICY IF EXISTS "Service role can manage daily counts" ON user_daily_notification_count;
CREATE POLICY "Service role can manage daily counts"
ON user_daily_notification_count FOR ALL
USING (auth.jwt()->>'role' = 'service_role');