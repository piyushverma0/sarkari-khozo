-- Add official_government_url column to discovery_stories table
ALTER TABLE discovery_stories 
ADD COLUMN IF NOT EXISTS official_government_url TEXT;

-- Add a comment for clarity
COMMENT ON COLUMN discovery_stories.official_government_url IS 'Official government source URL (.gov.in, .nic.in) for compliance with app store policies';