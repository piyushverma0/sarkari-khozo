-- Add last_notified_at column to track when story was last sent
ALTER TABLE discovery_stories
ADD COLUMN IF NOT EXISTS last_notified_at TIMESTAMPTZ;

-- Create index for efficient querying by notification time and relevance
CREATE INDEX IF NOT EXISTS idx_discovery_stories_last_notified
ON discovery_stories(last_notified_at, relevance_score DESC, published_date DESC);

-- Add index for fallback queries combining published date and notification tracking
CREATE INDEX IF NOT EXISTS idx_discovery_stories_published_notified
ON discovery_stories(published_date DESC, notified, last_notified_at);