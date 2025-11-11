-- Add notified column to discovery_stories table
ALTER TABLE discovery_stories
ADD COLUMN IF NOT EXISTS notified BOOLEAN DEFAULT FALSE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_discovery_stories_notified
ON discovery_stories(notified, published_date DESC)
WHERE notified = FALSE;
