-- UP Police Streak System Migration
-- Creates tables and functions for tracking user streaks and activity

-- ============================================================================
-- TABLE: up_police_streaks
-- Stores user streak data, badges, and activity counters
-- ============================================================================

CREATE TABLE IF NOT EXISTS up_police_streaks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    -- Streak tracking
    current_streak INT DEFAULT 0 CHECK (current_streak >= 0),
    longest_streak INT DEFAULT 0 CHECK (longest_streak >= 0),
    last_activity_date DATE,
    streak_freeze_count INT DEFAULT 0 CHECK (streak_freeze_count >= 0 AND streak_freeze_count <= 3),
    -- Activity counters
    total_notes_generated INT DEFAULT 0 CHECK (total_notes_generated >= 0),
    total_recall_questions_answered INT DEFAULT 0 CHECK (total_recall_questions_answered >= 0),
    total_flashcards_reviewed INT DEFAULT 0 CHECK (total_flashcards_reviewed >= 0),
    total_teach_me_sessions INT DEFAULT 0 CHECK (total_teach_me_sessions >= 0),
    total_study_days INT DEFAULT 0 CHECK (total_study_days >= 0),
    -- Badge progress
    badge_beginner_unlocked BOOLEAN DEFAULT FALSE,
    badge_consistent_unlocked BOOLEAN DEFAULT FALSE,
    badge_champion_unlocked BOOLEAN DEFAULT FALSE,
    badge_legend_unlocked BOOLEAN DEFAULT FALSE,
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Ensure one record per user
    UNIQUE(user_id)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_up_police_streaks_user_id ON up_police_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_up_police_streaks_current_streak ON up_police_streaks(current_streak DESC);
CREATE INDEX IF NOT EXISTS idx_up_police_streaks_last_activity ON up_police_streaks(last_activity_date DESC);

-- Enable RLS
ALTER TABLE up_police_streaks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own streak"
    ON up_police_streaks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own streak"
    ON up_police_streaks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own streak"
    ON up_police_streaks FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================================================
-- TABLE: up_police_activity_log
-- Detailed log of all UP Police study activities
-- ============================================================================

CREATE TABLE IF NOT EXISTS up_police_activity_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    -- Activity details
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'notes_generated',
        'recall_question_answered',
        'flashcard_reviewed',
        'teach_me_completed'
    )),
    activity_date DATE NOT NULL,
    -- Reference IDs
    note_id UUID REFERENCES study_notes(id) ON DELETE SET NULL,
    question_id TEXT,
    flashcard_id UUID REFERENCES note_flashcards(id) ON DELETE SET NULL,
    -- Metadata
    subject TEXT,
    was_correct BOOLEAN,
    time_spent_seconds INT CHECK (time_spent_seconds >= 0),
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Prevent duplicate activities (one per type per day)
    UNIQUE(user_id, activity_type, activity_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_up_police_activity_user_date ON up_police_activity_log(user_id, activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_up_police_activity_type ON up_police_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_up_police_activity_note_id ON up_police_activity_log(note_id);

-- Enable RLS
ALTER TABLE up_police_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own activity"
    ON up_police_activity_log FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity"
    ON up_police_activity_log FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- FUNCTION: update_up_police_streak
-- Main function to log activity and update streak
-- ============================================================================

CREATE OR REPLACE FUNCTION update_up_police_streak(
    p_user_id UUID,
    p_activity_type TEXT,
    p_note_id UUID DEFAULT NULL,
    p_question_id TEXT DEFAULT NULL,
    p_flashcard_id UUID DEFAULT NULL,
    p_subject TEXT DEFAULT NULL,
    p_was_correct BOOLEAN DEFAULT NULL,
    p_time_spent_seconds INT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
    v_last_activity_date DATE;
    v_current_streak INT;
    v_new_streak INT;
    v_streak_record RECORD;
    v_activity_count INT;
    v_badge_unlocked TEXT := NULL;
    v_freeze_awarded BOOLEAN := FALSE;
BEGIN
    -- Get current streak data
    SELECT * INTO v_streak_record
    FROM up_police_streaks
    WHERE user_id = p_user_id;

    -- Initialize if not exists
    IF v_streak_record IS NULL THEN
        INSERT INTO up_police_streaks (user_id, current_streak, last_activity_date)
        VALUES (p_user_id, 0, NULL)
        RETURNING * INTO v_streak_record;
    END IF;

    v_last_activity_date := v_streak_record.last_activity_date;
    v_current_streak := v_streak_record.current_streak;

    -- Check if any activity already logged today
    SELECT COUNT(*) INTO v_activity_count
    FROM up_police_activity_log
    WHERE user_id = p_user_id
      AND activity_date = v_today;

    -- Log the activity (UNIQUE constraint prevents duplicates)
    BEGIN
        INSERT INTO up_police_activity_log (
            user_id, activity_type, activity_date,
            note_id, question_id, flashcard_id,
            subject, was_correct, time_spent_seconds
        ) VALUES (
            p_user_id, p_activity_type, v_today,
            p_note_id, p_question_id, p_flashcard_id,
            p_subject, p_was_correct, p_time_spent_seconds
        );
    EXCEPTION WHEN unique_violation THEN
        -- Activity of this type already logged today, skip
        NULL;
    END;

    -- Calculate new streak (only if first activity today)
    IF v_activity_count = 0 THEN
        IF v_last_activity_date IS NULL THEN
            -- First ever activity
            v_new_streak := 1;
        ELSIF v_last_activity_date = v_yesterday THEN
            -- Consecutive day
            v_new_streak := v_current_streak + 1;
        ELSIF v_last_activity_date = v_today THEN
            -- Already active today (shouldn't happen, but handle it)
            v_new_streak := v_current_streak;
        ELSE
            -- Streak broken, check for freeze
            IF v_streak_record.streak_freeze_count > 0 THEN
                -- Use freeze
                v_new_streak := v_current_streak;
                UPDATE up_police_streaks
                SET streak_freeze_count = streak_freeze_count - 1,
                    updated_at = NOW()
                WHERE user_id = p_user_id;
            ELSE
                -- Streak broken, restart
                v_new_streak := 1;
            END IF;
        END IF;

        -- Update streak and counters
        UPDATE up_police_streaks
        SET current_streak = v_new_streak,
            longest_streak = GREATEST(longest_streak, v_new_streak),
            last_activity_date = v_today,
            total_study_days = total_study_days + 1,
            -- Update specific counters
            total_notes_generated = CASE WHEN p_activity_type = 'notes_generated'
                THEN total_notes_generated + 1 ELSE total_notes_generated END,
            total_recall_questions_answered = CASE WHEN p_activity_type = 'recall_question_answered'
                THEN total_recall_questions_answered + 1 ELSE total_recall_questions_answered END,
            total_flashcards_reviewed = CASE WHEN p_activity_type = 'flashcard_reviewed'
                THEN total_flashcards_reviewed + 1 ELSE total_flashcards_reviewed END,
            total_teach_me_sessions = CASE WHEN p_activity_type = 'teach_me_completed'
                THEN total_teach_me_sessions + 1 ELSE total_teach_me_sessions END,
            updated_at = NOW()
        WHERE user_id = p_user_id;

        -- Award freeze every 7 days (max 3)
        IF v_new_streak % 7 = 0 AND v_new_streak > 0 THEN
            UPDATE up_police_streaks
            SET streak_freeze_count = LEAST(streak_freeze_count + 1, 3)
            WHERE user_id = p_user_id
              AND streak_freeze_count < 3
            RETURNING (streak_freeze_count > v_streak_record.streak_freeze_count) INTO v_freeze_awarded;
        END IF;

        -- Check for new badge unlocks
        IF v_new_streak >= 1 AND NOT v_streak_record.badge_beginner_unlocked THEN
            UPDATE up_police_streaks SET badge_beginner_unlocked = TRUE WHERE user_id = p_user_id;
            v_badge_unlocked := 'beginner';
        ELSIF v_new_streak >= 7 AND NOT v_streak_record.badge_consistent_unlocked THEN
            UPDATE up_police_streaks SET badge_consistent_unlocked = TRUE WHERE user_id = p_user_id;
            v_badge_unlocked := 'consistent';
        ELSIF v_new_streak >= 21 AND NOT v_streak_record.badge_champion_unlocked THEN
            UPDATE up_police_streaks SET badge_champion_unlocked = TRUE WHERE user_id = p_user_id;
            v_badge_unlocked := 'champion';
        ELSIF v_new_streak >= 45 AND NOT v_streak_record.badge_legend_unlocked THEN
            UPDATE up_police_streaks SET badge_legend_unlocked = TRUE WHERE user_id = p_user_id;
            v_badge_unlocked := 'legend';
        END IF;

        -- Get updated freeze count
        SELECT streak_freeze_count INTO v_streak_record.streak_freeze_count
        FROM up_police_streaks
        WHERE user_id = p_user_id;

        -- Return result
        RETURN jsonb_build_object(
            'success', TRUE,
            'current_streak', v_new_streak,
            'longest_streak', GREATEST(v_streak_record.longest_streak, v_new_streak),
            'streak_freeze_count', v_streak_record.streak_freeze_count,
            'badge_unlocked', v_badge_unlocked,
            'freeze_awarded', v_freeze_awarded
        );
    ELSE
        -- Already active today, just return current state
        RETURN jsonb_build_object(
            'success', TRUE,
            'current_streak', v_current_streak,
            'longest_streak', v_streak_record.longest_streak,
            'streak_freeze_count', v_streak_record.streak_freeze_count,
            'already_active_today', TRUE
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_up_police_streak TO authenticated;

-- Add comment
COMMENT ON FUNCTION update_up_police_streak IS 'Logs UP Police activity and updates user streak, badges, and counters';