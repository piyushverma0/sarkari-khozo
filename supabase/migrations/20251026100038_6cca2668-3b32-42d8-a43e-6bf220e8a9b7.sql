-- Fix function search paths only
CREATE OR REPLACE FUNCTION calculate_engagement_score(
  p_view_count integer,
  p_save_count integer,
  p_share_count integer
) RETURNS integer AS $$
BEGIN
  RETURN (p_view_count * 1 + p_save_count * 5 + p_share_count * 10);
END;
$$ LANGUAGE plpgsql IMMUTABLE
SET search_path TO public;

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
$$ LANGUAGE plpgsql
SET search_path TO public;