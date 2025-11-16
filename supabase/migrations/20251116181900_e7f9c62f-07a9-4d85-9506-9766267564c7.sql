-- Add audio functionality fields to study_notes table
-- Audio URLs (stored in Supabase Storage)
ALTER TABLE study_notes ADD COLUMN audio_hindi_url TEXT NULL;
ALTER TABLE study_notes ADD COLUMN audio_english_url TEXT NULL;

-- Audio metadata
ALTER TABLE study_notes ADD COLUMN audio_hindi_duration INTEGER NULL;
ALTER TABLE study_notes ADD COLUMN audio_english_duration INTEGER NULL;

-- Generation status tracking
ALTER TABLE study_notes ADD COLUMN audio_generation_status TEXT DEFAULT 'not_generated';

-- Error tracking
ALTER TABLE study_notes ADD COLUMN audio_generation_error TEXT NULL;

-- Conversation script storage (JSONB for flexibility)
ALTER TABLE study_notes ADD COLUMN audio_script_hindi JSONB NULL;
ALTER TABLE study_notes ADD COLUMN audio_script_english JSONB NULL;

-- Generation timestamps
ALTER TABLE study_notes ADD COLUMN audio_generated_at TIMESTAMP WITH TIME ZONE NULL;
ALTER TABLE study_notes ADD COLUMN audio_last_played_at TIMESTAMP WITH TIME ZONE NULL;

-- Add flag to track if note has audio
ALTER TABLE study_notes ADD COLUMN has_audio BOOLEAN DEFAULT false;