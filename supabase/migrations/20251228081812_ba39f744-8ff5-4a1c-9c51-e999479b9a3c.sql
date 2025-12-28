-- ============================================================
-- Daily General Knowledge MCQs - Database Schema
-- ============================================================

-- Table 1: daily_gk_mcqs - Stores the daily generated MCQs
CREATE TABLE IF NOT EXISTS daily_gk_mcqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    questions JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_questions_format CHECK (jsonb_typeof(questions) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_daily_gk_mcqs_date ON daily_gk_mcqs(date DESC);

COMMENT ON TABLE daily_gk_mcqs IS 'Stores daily general knowledge MCQs (5 questions per day)';
COMMENT ON COLUMN daily_gk_mcqs.date IS 'Date for this MCQ set (YYYY-MM-DD)';
COMMENT ON COLUMN daily_gk_mcqs.questions IS 'JSONB array of 5 MCQ objects';

-- Enable RLS
ALTER TABLE daily_gk_mcqs ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can view daily MCQs"
    ON daily_gk_mcqs
    FOR SELECT
    USING (true);

-- Service role can manage
CREATE POLICY "Service role can manage MCQs"
    ON daily_gk_mcqs
    FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================
-- Table 2: user_gk_responses - Tracks user answers
-- ============================================================
CREATE TABLE IF NOT EXISTS user_gk_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    mcq_date DATE NOT NULL,
    question_index INTEGER NOT NULL CHECK (question_index >= 0 AND question_index <= 4),
    selected_answer TEXT NOT NULL CHECK (selected_answer IN ('A', 'B', 'C', 'D')),
    is_correct BOOLEAN NOT NULL,
    answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, mcq_date, question_index)
);

CREATE INDEX IF NOT EXISTS idx_user_gk_responses_user_date ON user_gk_responses(user_id, mcq_date);
CREATE INDEX IF NOT EXISTS idx_user_gk_responses_date ON user_gk_responses(mcq_date DESC);

COMMENT ON TABLE user_gk_responses IS 'Tracks user answers for daily GK MCQs';

-- Enable RLS
ALTER TABLE user_gk_responses ENABLE ROW LEVEL SECURITY;

-- Users can view their own responses
CREATE POLICY "Users can view their own GK responses"
    ON user_gk_responses
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own responses
CREATE POLICY "Users can insert their own GK responses"
    ON user_gk_responses
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own responses
CREATE POLICY "Users can update their own GK responses"
    ON user_gk_responses
    FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================================
-- Trigger for updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_daily_gk_mcqs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_daily_gk_mcqs_timestamp
    BEFORE UPDATE ON daily_gk_mcqs
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_gk_mcqs_updated_at();

-- ============================================================
-- Function to get user's daily score
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_daily_gk_score(
    p_user_id UUID,
    p_date DATE
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'date', p_date,
        'total_questions', 5,
        'answered', COUNT(*),
        'correct', COUNT(*) FILTER (WHERE is_correct = TRUE),
        'score_percentage', CASE
            WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE is_correct = TRUE) * 100.0 / COUNT(*))
            ELSE 0
        END
    ) INTO result
    FROM user_gk_responses
    WHERE user_id = p_user_id AND mcq_date = p_date;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION get_user_daily_gk_score(UUID, DATE) TO authenticated;