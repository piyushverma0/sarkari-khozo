-- ============================================================
-- Migration 007: Match Game Tables
-- ============================================================
-- Creates tables for storing daily match game sets and user results
-- Used for home screen "Match" section
-- ============================================================

-- Table: daily_match_sets
-- Stores daily generated match game sets (term-definition pairs)
-- Each day has 3 topics with 6 pairs each
CREATE TABLE IF NOT EXISTS daily_match_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    topic TEXT NOT NULL,  -- e.g., "General Knowledge", "Indian History", "Science & Tech"
    pairs JSONB NOT NULL,  -- Array of {term, definition} pairs
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(date, topic)  -- One set per topic per day
);

-- Table: user_match_results
-- Stores individual user game completion results
CREATE TABLE IF NOT EXISTS user_match_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    match_set_id UUID REFERENCES daily_match_sets(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    completion_time_seconds INTEGER NOT NULL CHECK (completion_time_seconds > 0),
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),  -- Wrong match count
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_match_sets_date ON daily_match_sets(date DESC);
CREATE INDEX IF NOT EXISTS idx_match_sets_date_topic ON daily_match_sets(date, topic);
CREATE INDEX IF NOT EXISTS idx_match_results_user ON user_match_results(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_results_topic ON user_match_results(topic, completion_time_seconds ASC);

-- RLS Policies
ALTER TABLE daily_match_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_match_results ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read daily match sets
CREATE POLICY "Allow public read access to match sets"
    ON daily_match_sets
    FOR SELECT
    USING (true);

-- Policy: Users can read their own results
CREATE POLICY "Users can read their own match results"
    ON user_match_results
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own results
CREATE POLICY "Users can insert their own match results"
    ON user_match_results
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Helper Function: Get user's best time for a topic
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_best_time_for_topic(
    p_user_id UUID,
    p_topic TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_best_time INTEGER;
BEGIN
    SELECT MIN(completion_time_seconds)
    INTO v_best_time
    FROM user_match_results
    WHERE user_id = p_user_id
    AND topic = p_topic;
    
    RETURN COALESCE(v_best_time, 0);
END;
$$;

-- ============================================================
-- Helper Function: Get topic leaderboard (top 10)
-- ============================================================
CREATE OR REPLACE FUNCTION get_topic_leaderboard(
    p_topic TEXT,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
    user_id UUID,
    best_time INTEGER,
    total_games INTEGER,
    rank BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        umr.user_id,
        MIN(umr.completion_time_seconds)::INTEGER as best_time,
        COUNT(*)::INTEGER as total_games,
        ROW_NUMBER() OVER (ORDER BY MIN(umr.completion_time_seconds)) as rank
    FROM user_match_results umr
    WHERE umr.topic = p_topic
    GROUP BY umr.user_id
    ORDER BY best_time ASC
    LIMIT p_limit;
END;
$$;

-- Comments
COMMENT ON TABLE daily_match_sets IS 'Stores daily generated match game sets with term-definition pairs';
COMMENT ON TABLE user_match_results IS 'Stores user game completion results with time and accuracy';
COMMENT ON COLUMN user_match_results.attempts IS 'Number of wrong matches before completion';