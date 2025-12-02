-- Add mind map columns to study_notes table
ALTER TABLE study_notes ADD COLUMN mind_map_data JSONB;
ALTER TABLE study_notes ADD COLUMN has_mind_map BOOLEAN DEFAULT FALSE;
ALTER TABLE study_notes ADD COLUMN mind_map_generated_at TIMESTAMP WITH TIME ZONE;