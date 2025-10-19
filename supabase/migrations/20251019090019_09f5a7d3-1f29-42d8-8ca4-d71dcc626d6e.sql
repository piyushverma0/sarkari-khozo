-- Add ai_enrichment column to applications table to store AI-generated insights
ALTER TABLE applications 
ADD COLUMN ai_enrichment JSONB DEFAULT NULL;

-- Add GIN index for faster JSONB queries on ai_enrichment column
CREATE INDEX idx_applications_ai_enrichment 
ON applications USING GIN (ai_enrichment);

-- Add comment to document the column structure
COMMENT ON COLUMN applications.ai_enrichment IS 'AI-generated enrichment data including founder insights, checklists, success metrics, and real examples. Cached for 30 days.';