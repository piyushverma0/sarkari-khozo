-- ============================================================================
-- USER STATS FEATURE - DATABASE SCHEMA
-- ============================================================================
-- This migration creates tables for comprehensive user statistics tracking
-- including performance metrics, note analytics, and exam goal tracking

-- ============================================================================
-- USER STATS TABLE - Cached aggregate statistics
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    -- Overall metrics
    total_notes_generated INTEGER DEFAULT 0,
    total_study_time_minutes INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    joined_date TIMESTAMPTZ NOT NULL,
    -- Performance scores (0-100)
    overall_performance_score INTEGER DEFAULT 0,
    quiz_accuracy DOUBLE PRECISION DEFAULT 0,
    flashcard_mastery_rate DOUBLE PRECISION DEFAULT 0,
    teach_me_completion_rate DOUBLE PRECISION DEFAULT 0,
    mock_test_average_score DOUBLE PRECISION DEFAULT 0,
    -- Aggregated data (JSONB for flexibility)
    notes_by_source_type JSONB DEFAULT '{}',
    notes_by_category JSONB DEFAULT '{}',
    weekly_activity JSONB DEFAULT '[]',
    tracked_exams JSONB DEFAULT '[]',
    -- Feature usage counters
    flashcards_reviewed INTEGER DEFAULT 0,
    quizzes_attempted INTEGER DEFAULT 0,
    teach_me_sessions_completed INTEGER DEFAULT 0,
    mock_tests_completed INTEGER DEFAULT 0,
    mind_maps_generated INTEGER DEFAULT 0,
    cheat_codes_accessed INTEGER DEFAULT 0,
    -- Metadata
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT user_stats_user_id_unique UNIQUE(user_id),
    CONSTRAINT user_stats_overall_score_range CHECK (overall_performance_score BETWEEN 0 AND 100)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stats_last_updated ON user_stats(last_updated);

-- Row Level Security
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stats"
    ON user_stats FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats"
    ON user_stats FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats"
    ON user_stats FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================================================
-- NOTE PERFORMANCE TABLE - Per-note analytics
-- ============================================================================
CREATE TABLE IF NOT EXISTS note_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES study_notes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    -- Engagement metrics
    view_count INTEGER DEFAULT 0,
    total_time_spent_minutes INTEGER DEFAULT 0,
    -- Quiz performance
    quizzes_taken INTEGER DEFAULT 0,
    quiz_average_score DOUBLE PRECISION,
    quiz_highest_score INTEGER,
    quiz_weak_topics JSONB DEFAULT '[]',
    -- Flashcard performance
    flashcards_total INTEGER DEFAULT 0,
    flashcards_mastered INTEGER DEFAULT 0,
    flashcards_reviewed_today INTEGER DEFAULT 0,
    flashcard_mastery_rate DOUBLE PRECISION DEFAULT 0,
    flashcard_due_count INTEGER DEFAULT 0,
    -- Teach Me performance
    teach_me_sessions INTEGER DEFAULT 0,
    teach_me_completed_sessions INTEGER DEFAULT 0,
    teach_me_concepts_mastered INTEGER DEFAULT 0,
    teach_me_weak_areas JSONB DEFAULT '[]',
    teach_me_progress_percentage DOUBLE PRECISION DEFAULT 0,
    -- Mind Map usage
    mind_map_access_count INTEGER DEFAULT 0,
    -- Mock Test performance
    mock_tests_attempted INTEGER DEFAULT 0,
    mock_test_average_score DOUBLE PRECISION,
    mock_test_highest_score DOUBLE PRECISION,
    -- Overall assessment
    performance_score INTEGER DEFAULT 0,
    strength_areas JSONB DEFAULT '[]',
    improvement_areas JSONB DEFAULT '[]',
    -- Timestamps
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT note_performance_unique UNIQUE(note_id, user_id),
    CONSTRAINT note_performance_score_range CHECK (performance_score BETWEEN 0 AND 100)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_note_performance_note_id ON note_performance(note_id);
CREATE INDEX IF NOT EXISTS idx_note_performance_user_id ON note_performance(user_id);
CREATE INDEX IF NOT EXISTS idx_note_performance_score ON note_performance(performance_score DESC);

-- Row Level Security
ALTER TABLE note_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own note performance"
    ON note_performance FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own note performance"
    ON note_performance FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own note performance"
    ON note_performance FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================================================
-- DAILY ACTIVITY TABLE - Streak and heatmap data
-- ============================================================================
CREATE TABLE IF NOT EXISTS daily_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    -- Activity counters
    notes_generated INTEGER DEFAULT 0,
    quizzes_taken INTEGER DEFAULT 0,
    flashcards_reviewed INTEGER DEFAULT 0,
    study_time_minutes INTEGER DEFAULT 0,
    teach_me_sessions INTEGER DEFAULT 0,
    -- Calculated score (0-100)
    activity_score INTEGER DEFAULT 0,
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT daily_activity_unique UNIQUE(user_id, activity_date),
    CONSTRAINT daily_activity_score_range CHECK (activity_score BETWEEN 0 AND 100)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_activity_user_date ON daily_activity(user_id, activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_activity_score ON daily_activity(activity_score DESC);

-- Row Level Security
ALTER TABLE daily_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily activity"
    ON daily_activity FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily activity"
    ON daily_activity FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily activity"
    ON daily_activity FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================================================
-- TRACKED EXAM PROGRESS TABLE - Goal tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS tracked_exam_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exam_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    exam_title TEXT NOT NULL,
    exam_date DATE,
    -- Preparation metrics
    related_notes_count INTEGER DEFAULT 0,
    related_quizzes_completed INTEGER DEFAULT 0,
    related_mock_tests_completed INTEGER DEFAULT 0,
    mock_test_average_score DOUBLE PRECISION,
    -- Progress tracking
    preparedness_score INTEGER DEFAULT 0,
    concepts_covered INTEGER DEFAULT 0,
    concepts_total INTEGER DEFAULT 0,
    weak_topics JSONB DEFAULT '[]',
    strong_topics JSONB DEFAULT '[]',
    suggested_actions JSONB DEFAULT '[]',
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT tracked_exam_unique UNIQUE(user_id, exam_id),
    CONSTRAINT tracked_exam_preparedness_range CHECK (preparedness_score BETWEEN 0 AND 100)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tracked_exam_user_id ON tracked_exam_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_tracked_exam_exam_date ON tracked_exam_progress(exam_date);

-- Row Level Security
ALTER TABLE tracked_exam_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tracked exams"
    ON tracked_exam_progress FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tracked exams"
    ON tracked_exam_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tracked exams"
    ON tracked_exam_progress FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tracked exams"
    ON tracked_exam_progress FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- DATABASE FUNCTIONS FOR AGGREGATIONS
-- ============================================================================

-- Calculate activity score based on daily actions
CREATE OR REPLACE FUNCTION calculate_activity_score(
    p_notes_generated INTEGER,
    p_quizzes_taken INTEGER,
    p_flashcards_reviewed INTEGER,
    p_study_time_minutes INTEGER,
    p_teach_me_sessions INTEGER
)
RETURNS INTEGER AS $$
BEGIN
    RETURN LEAST(100,
        LEAST(p_notes_generated * 5, 20) +
        LEAST(p_quizzes_taken * 5, 25) +
        LEAST(p_flashcards_reviewed / 5, 20) +
        LEAST(p_study_time_minutes / 6, 25) +
        LEAST(p_teach_me_sessions * 5, 10)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Calculate note performance score from available metrics
CREATE OR REPLACE FUNCTION calculate_note_performance_score(
    p_quiz_average DOUBLE PRECISION,
    p_flashcard_mastery DOUBLE PRECISION,
    p_teach_me_progress DOUBLE PRECISION
)
RETURNS INTEGER AS $$
DECLARE
    v_score DOUBLE PRECISION := 0;
    v_factors INTEGER := 0;
BEGIN
    IF p_quiz_average IS NOT NULL THEN
        v_score := v_score + p_quiz_average;
        v_factors := v_factors + 1;
    END IF;
    IF p_flashcard_mastery IS NOT NULL THEN
        v_score := v_score + (p_flashcard_mastery * 100);
        v_factors := v_factors + 1;
    END IF;
    IF p_teach_me_progress IS NOT NULL THEN
        v_score := v_score + p_teach_me_progress;
        v_factors := v_factors + 1;
    END IF;
    IF v_factors = 0 THEN
        RETURN 0;
    END IF;
    RETURN ROUND(v_score / v_factors)::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- TRIGGER TO AUTO-UPDATE LAST_UPDATED
-- ============================================================================
CREATE OR REPLACE FUNCTION update_stats_last_updated_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_user_stats_last_updated
    BEFORE UPDATE ON user_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_stats_last_updated_column();

CREATE TRIGGER update_note_performance_last_updated
    BEFORE UPDATE ON note_performance
    FOR EACH ROW
    EXECUTE FUNCTION update_stats_last_updated_column();

CREATE TRIGGER update_tracked_exam_last_updated
    BEFORE UPDATE ON tracked_exam_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_stats_last_updated_column();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE user_stats IS 'Aggregate user statistics for analytics dashboard';
COMMENT ON TABLE note_performance IS 'Per-note performance metrics across all features';
COMMENT ON TABLE daily_activity IS 'Daily activity tracking for streaks and heatmaps';
COMMENT ON TABLE tracked_exam_progress IS 'Exam goal tracking with preparedness metrics';
COMMENT ON FUNCTION calculate_activity_score IS 'Calculates weighted activity score (0-100) from daily actions';
COMMENT ON FUNCTION calculate_note_performance_score IS 'Calculates overall note performance from quiz, flashcard, and teach me metrics';