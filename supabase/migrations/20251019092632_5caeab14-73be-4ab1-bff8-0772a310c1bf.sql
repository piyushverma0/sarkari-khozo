-- Clean up non-startup applications
-- Remove startup-specific fields from programs that are not in the Startups category

UPDATE applications 
SET 
  program_type = NULL,
  funding_amount = NULL,
  sector = NULL,
  stage = NULL,
  dpiit_required = NULL,
  ai_enrichment = NULL
WHERE category IS NOT NULL 
  AND LOWER(category) != 'startups';