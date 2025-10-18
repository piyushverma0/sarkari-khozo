-- Add application_guidance column to store structured AI-generated guidance
ALTER TABLE applications ADD COLUMN application_guidance jsonb;