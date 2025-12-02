-- Add mind_map_generation_status column to study_notes table
ALTER TABLE study_notes ADD COLUMN mind_map_generation_status TEXT DEFAULT 'not_generated';