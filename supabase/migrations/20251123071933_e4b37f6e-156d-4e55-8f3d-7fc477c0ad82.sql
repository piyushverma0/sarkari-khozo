-- Drop existing ai_explanations table if it exists
DROP TABLE IF EXISTS ai_explanations CASCADE;

-- Create AI Explanations Cache Table
-- Stores AI-generated explanations for reuse and faster responses

CREATE TABLE ai_explanations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    text_hash TEXT NOT NULL UNIQUE, -- MD5/SHA hash of the text for quick lookup
    text_content TEXT NOT NULL, -- Original text that was explained
    explanation TEXT NOT NULL, -- Main explanation text
    key_points TEXT[] NOT NULL DEFAULT '{}', -- Array of key points
    examples JSONB DEFAULT '[]', -- Array of examples with title and description
    related_info JSONB, -- Related information including current updates and links
    exam_tips TEXT[] DEFAULT '{}', -- Array of exam tips
    difficulty_level TEXT NOT NULL CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    estimated_read_time TEXT NOT NULL,
    usage_count INTEGER DEFAULT 1, -- Track how many times this explanation was used
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on text_hash for fast lookups
CREATE INDEX idx_ai_explanations_text_hash ON ai_explanations(text_hash);

-- Create index on created_at for cleanup queries
CREATE INDEX idx_ai_explanations_created_at ON ai_explanations(created_at);

-- Create index on usage_count to find popular explanations
CREATE INDEX idx_ai_explanations_usage_count ON ai_explanations(usage_count DESC);

-- Enable Row Level Security
ALTER TABLE ai_explanations ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can read cached explanations
CREATE POLICY "Allow authenticated users to read explanations"
    ON ai_explanations
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Service role can insert and update
CREATE POLICY "Allow service role to insert explanations"
    ON ai_explanations
    FOR INSERT
    TO service_role
    WITH CHECK (true);

CREATE POLICY "Allow service role to update explanations"
    ON ai_explanations
    FOR UPDATE
    TO service_role
    USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_explanations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to automatically update updated_at
CREATE TRIGGER ai_explanations_updated_at
    BEFORE UPDATE ON ai_explanations
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_explanations_updated_at();

-- Function to increment usage count and update last_used_at
CREATE OR REPLACE FUNCTION increment_explanation_usage(explanation_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE ai_explanations
    SET
        usage_count = usage_count + 1,
        last_used_at = NOW()
    WHERE id = explanation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON TABLE ai_explanations IS 'Caches AI-generated text explanations for reuse and performance';
COMMENT ON COLUMN ai_explanations.text_hash IS 'Hash of the original text for quick cache lookups';
COMMENT ON COLUMN ai_explanations.usage_count IS 'Number of times this explanation has been served from cache';