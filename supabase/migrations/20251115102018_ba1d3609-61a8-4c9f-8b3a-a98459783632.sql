-- Add new categories to discovery_stories
ALTER TABLE discovery_stories DROP CONSTRAINT IF EXISTS discovery_stories_category_check;
ALTER TABLE discovery_stories ADD CONSTRAINT discovery_stories_category_check 
  CHECK (category IN ('exams', 'jobs', 'schemes', 'policies', 'current-affairs', 'international', 'education', 'diplomatic'));

-- Update RLS policy comments for clarity
COMMENT ON TABLE discovery_stories IS 'Discovery feed stories supporting exams, jobs, schemes, policies, current affairs, international news, education, and diplomatic updates';