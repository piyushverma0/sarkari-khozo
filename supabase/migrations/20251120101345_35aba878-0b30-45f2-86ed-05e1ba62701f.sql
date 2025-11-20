-- Add audio processing metadata fields to study_notes table
ALTER TABLE study_notes 
ADD COLUMN IF NOT EXISTS source_audio_duration INT,
ADD COLUMN IF NOT EXISTS source_audio_file_size BIGINT,
ADD COLUMN IF NOT EXISTS source_audio_format TEXT,
ADD COLUMN IF NOT EXISTS transcription_confidence DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS transcription_method TEXT;