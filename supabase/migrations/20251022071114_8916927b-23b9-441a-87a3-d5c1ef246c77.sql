-- Add new columns for enhanced date tracking
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS date_confidence TEXT,
ADD COLUMN IF NOT EXISTS date_source TEXT,
ADD COLUMN IF NOT EXISTS dates_last_verified TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN applications.date_confidence IS 'Confidence level of extracted dates: verified, estimated, or tentative';
COMMENT ON COLUMN applications.date_source IS 'URL source where dates were found';
COMMENT ON COLUMN applications.dates_last_verified IS 'Timestamp when dates were last verified/updated';