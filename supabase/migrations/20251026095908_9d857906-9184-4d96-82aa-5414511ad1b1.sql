-- Add time-based view tracking columns to discovery_stories
ALTER TABLE discovery_stories 
ADD COLUMN IF NOT EXISTS views_today integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS views_this_week integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS views_last_updated timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS first_viewed_at timestamp with time zone;

-- Add engagement analytics columns
ALTER TABLE discovery_stories
ADD COLUMN IF NOT EXISTS engagement_score integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS save_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS click_through_rate numeric DEFAULT 0;

-- Create function to calculate engagement score
CREATE OR REPLACE FUNCTION calculate_engagement_score(
  p_view_count integer,
  p_save_count integer,
  p_share_count integer
) RETURNS integer AS $$
BEGIN
  RETURN (p_view_count * 1 + p_save_count * 5 + p_share_count * 10);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to update engagement metrics
CREATE OR REPLACE FUNCTION update_engagement_metrics()
RETURNS TRIGGER AS $$
BEGIN
  NEW.engagement_score := calculate_engagement_score(
    NEW.view_count,
    NEW.save_count,
    NEW.share_count
  );
  
  IF NEW.view_count > 0 THEN
    NEW.save_rate := (NEW.save_count::numeric / NEW.view_count * 100);
    NEW.click_through_rate := (NEW.click_count::numeric / NEW.view_count * 100);
  ELSE
    NEW.save_rate := 0;
    NEW.click_through_rate := 0;
  END IF;
  
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for engagement metrics
DROP TRIGGER IF EXISTS update_engagement_metrics_trigger ON discovery_stories;
CREATE TRIGGER update_engagement_metrics_trigger
BEFORE UPDATE ON discovery_stories
FOR EACH ROW
WHEN (
  OLD.view_count IS DISTINCT FROM NEW.view_count OR
  OLD.save_count IS DISTINCT FROM NEW.save_count OR
  OLD.share_count IS DISTINCT FROM NEW.share_count OR
  OLD.click_count IS DISTINCT FROM NEW.click_count
)
EXECUTE FUNCTION update_engagement_metrics();

-- Create analytics view
CREATE OR REPLACE VIEW story_analytics AS
SELECT 
  id,
  headline,
  category,
  region,
  view_count,
  save_count,
  share_count,
  click_count,
  views_today,
  views_this_week,
  engagement_score,
  save_rate,
  click_through_rate,
  published_date,
  created_at
FROM discovery_stories
WHERE is_active = true
ORDER BY engagement_score DESC;