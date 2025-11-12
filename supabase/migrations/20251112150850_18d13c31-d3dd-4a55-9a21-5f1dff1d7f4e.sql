-- ============================================================================
-- STUDY NOTES & MATERIALS SYSTEM
-- Database schema for PDF/DOC/YouTube -> AI-powered study notes
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- MAIN TABLES
-- ============================================================================

-- Note folders for organization (created first due to foreign key dependency)
CREATE TABLE IF NOT EXISTS note_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#6366F1',
    icon TEXT DEFAULT 'folder',
    
    is_smart_folder BOOLEAN DEFAULT false,
    smart_filter_rules JSONB,
    
    parent_folder_id UUID REFERENCES note_folders(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, name)
);

-- Study notes table
CREATE TABLE IF NOT EXISTS study_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    title TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('pdf', 'docx', 'youtube', 'url', 'gdrive')),
    source_url TEXT,
    source_filename TEXT,
    storage_path TEXT,
    
    original_language TEXT DEFAULT 'en',
    current_language TEXT DEFAULT 'en',
    
    raw_content TEXT,
    structured_content JSONB,
    summary TEXT,
    key_points TEXT[],
    
    folder_id UUID REFERENCES note_folders(id) ON DELETE SET NULL,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_favorite BOOLEAN DEFAULT false,
    
    word_count INTEGER,
    estimated_read_time INTEGER,
    
    has_flashcards BOOLEAN DEFAULT false,
    has_quiz BOOLEAN DEFAULT false,
    has_translation BOOLEAN DEFAULT false,
    
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'extracting', 'summarizing', 'completed', 'failed')),
    processing_error TEXT,
    processing_progress INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ
);

-- Flashcards for spaced repetition learning
CREATE TABLE IF NOT EXISTS note_flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES study_notes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    hint TEXT,
    category TEXT,
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
    
    ease_factor DECIMAL DEFAULT 2.5,
    interval INTEGER DEFAULT 0,
    repetitions INTEGER DEFAULT 0,
    next_review_date TIMESTAMPTZ,
    last_reviewed_at TIMESTAMPTZ,
    
    times_reviewed INTEGER DEFAULT 0,
    times_correct INTEGER DEFAULT 0,
    times_incorrect INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quizzes for knowledge assessment
CREATE TABLE IF NOT EXISTS note_quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES study_notes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    title TEXT NOT NULL,
    description TEXT,
    quiz_type TEXT DEFAULT 'mcq' CHECK (quiz_type IN ('mcq', 'short_answer', 'true_false', 'mixed')),
    
    time_limit_minutes INTEGER,
    passing_score INTEGER DEFAULT 70,
    show_answers_immediately BOOLEAN DEFAULT true,
    
    questions JSONB NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quiz attempts to track user progress
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES note_quizzes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL,
    time_taken_seconds INTEGER,
    
    answers JSONB NOT NULL,
    
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Translation cache
CREATE TABLE IF NOT EXISTS note_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES study_notes(id) ON DELETE CASCADE,
    target_language TEXT NOT NULL,
    
    translated_title TEXT NOT NULL,
    translated_content JSONB NOT NULL,
    translated_summary TEXT,
    translated_key_points TEXT[],
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(note_id, target_language)
);

-- Study session tracking for analytics
CREATE TABLE IF NOT EXISTS study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    note_id UUID REFERENCES study_notes(id) ON DELETE CASCADE,
    
    session_type TEXT CHECK (session_type IN ('reading', 'flashcards', 'quiz')),
    duration_seconds INTEGER NOT NULL,
    items_reviewed INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_study_notes_user_id ON study_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_study_notes_folder_id ON study_notes(folder_id);
CREATE INDEX IF NOT EXISTS idx_study_notes_tags ON study_notes USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_study_notes_processing_status ON study_notes(processing_status);
CREATE INDEX IF NOT EXISTS idx_study_notes_created_at ON study_notes(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_note_folders_user_id ON note_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_note_folders_parent ON note_folders(parent_folder_id);

CREATE INDEX IF NOT EXISTS idx_note_flashcards_note_id ON note_flashcards(note_id);
CREATE INDEX IF NOT EXISTS idx_note_flashcards_user_id ON note_flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_note_flashcards_next_review ON note_flashcards(user_id, next_review_date) WHERE next_review_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_note_quizzes_note_id ON note_quizzes(note_id);
CREATE INDEX IF NOT EXISTS idx_note_quizzes_user_id ON note_quizzes(user_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON quiz_attempts(user_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_note_translations_note_id ON note_translations(note_id);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id, created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE study_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

-- Study notes policies
CREATE POLICY "Users can view their own notes" 
    ON study_notes FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notes" 
    ON study_notes FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes" 
    ON study_notes FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes" 
    ON study_notes FOR DELETE 
    USING (auth.uid() = user_id);

-- Note folders policies
CREATE POLICY "Users can view their own folders" 
    ON note_folders FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own folders" 
    ON note_folders FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders" 
    ON note_folders FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders" 
    ON note_folders FOR DELETE 
    USING (auth.uid() = user_id);

-- Flashcards policies
CREATE POLICY "Users can view their own flashcards" 
    ON note_flashcards FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert flashcards for their notes" 
    ON note_flashcards FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flashcards" 
    ON note_flashcards FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flashcards" 
    ON note_flashcards FOR DELETE 
    USING (auth.uid() = user_id);

-- Quiz policies
CREATE POLICY "Users can view their own quizzes" 
    ON note_quizzes FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert quizzes for their notes" 
    ON note_quizzes FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quizzes" 
    ON note_quizzes FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quizzes" 
    ON note_quizzes FOR DELETE 
    USING (auth.uid() = user_id);

-- Quiz attempts policies
CREATE POLICY "Users can view their own quiz attempts" 
    ON quiz_attempts FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quiz attempts" 
    ON quiz_attempts FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Translation policies
CREATE POLICY "Users can view translations for their notes" 
    ON note_translations FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM study_notes 
        WHERE study_notes.id = note_translations.note_id 
        AND study_notes.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert translations for their notes" 
    ON note_translations FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM study_notes 
        WHERE study_notes.id = note_translations.note_id 
        AND study_notes.user_id = auth.uid()
    ));

-- Study sessions policies
CREATE POLICY "Users can view their own study sessions" 
    ON study_sessions FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own study sessions" 
    ON study_sessions FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- TRIGGERS FOR AUTO-UPDATING TIMESTAMPS
-- ============================================================================

CREATE TRIGGER update_study_notes_updated_at 
    BEFORE UPDATE ON study_notes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_note_folders_updated_at 
    BEFORE UPDATE ON note_folders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_note_flashcards_updated_at 
    BEFORE UPDATE ON note_flashcards 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTIONS FOR COMMON OPERATIONS
-- ============================================================================

-- Function to get notes count by folder
CREATE OR REPLACE FUNCTION get_notes_count_by_folder(p_user_id UUID)
RETURNS TABLE (
    folder_id UUID,
    folder_name TEXT,
    notes_count BIGINT
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id as folder_id,
        f.name as folder_name,
        COUNT(n.id) as notes_count
    FROM note_folders f
    LEFT JOIN study_notes n ON n.folder_id = f.id
    WHERE f.user_id = p_user_id
    GROUP BY f.id, f.name
    ORDER BY f.sort_order, f.name;
END;
$$;

-- Function to get flashcards due for review
CREATE OR REPLACE FUNCTION get_flashcards_due_today(p_user_id UUID)
RETURNS SETOF note_flashcards 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM note_flashcards
    WHERE user_id = p_user_id
    AND (next_review_date IS NULL OR next_review_date <= NOW())
    ORDER BY next_review_date ASC NULLS FIRST;
END;
$$;

-- Function to update flashcard after review (SuperMemo SM-2)
CREATE OR REPLACE FUNCTION update_flashcard_review(
    p_flashcard_id UUID,
    p_quality INTEGER
)
RETURNS note_flashcards 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_flashcard note_flashcards;
    v_new_ease_factor DECIMAL;
    v_new_interval INTEGER;
    v_new_repetitions INTEGER;
BEGIN
    SELECT * INTO v_flashcard FROM note_flashcards WHERE id = p_flashcard_id;
    
    UPDATE note_flashcards SET
        times_reviewed = times_reviewed + 1,
        times_correct = times_correct + CASE WHEN p_quality >= 3 THEN 1 ELSE 0 END,
        times_incorrect = times_incorrect + CASE WHEN p_quality < 3 THEN 1 ELSE 0 END,
        last_reviewed_at = NOW()
    WHERE id = p_flashcard_id;
    
    IF p_quality < 3 THEN
        v_new_repetitions := 0;
        v_new_interval := 1;
        v_new_ease_factor := v_flashcard.ease_factor;
    ELSE
        v_new_repetitions := v_flashcard.repetitions + 1;
        v_new_ease_factor := v_flashcard.ease_factor + (0.1 - (5 - p_quality) * (0.08 + (5 - p_quality) * 0.02));
        
        IF v_new_ease_factor < 1.3 THEN
            v_new_ease_factor := 1.3;
        END IF;
        
        IF v_new_repetitions = 1 THEN
            v_new_interval := 1;
        ELSIF v_new_repetitions = 2 THEN
            v_new_interval := 6;
        ELSE
            v_new_interval := ROUND(v_flashcard.interval * v_new_ease_factor)::INTEGER;
        END IF;
    END IF;
    
    UPDATE note_flashcards SET
        ease_factor = v_new_ease_factor,
        interval = v_new_interval,
        repetitions = v_new_repetitions,
        next_review_date = NOW() + (v_new_interval || ' days')::INTERVAL
    WHERE id = p_flashcard_id
    RETURNING * INTO v_flashcard;
    
    RETURN v_flashcard;
END;
$$;

-- Function to create default folders for new users
CREATE OR REPLACE FUNCTION create_default_note_folders(p_user_id UUID)
RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO note_folders (user_id, name, description, color, icon, sort_order)
    VALUES 
        (p_user_id, 'UPSC', 'UPSC exam materials', '#EF4444', 'school', 1),
        (p_user_id, 'SSC', 'SSC exam materials', '#3B82F6', 'assignment', 2),
        (p_user_id, 'Banking', 'Banking exams (IBPS, SBI)', '#10B981', 'account_balance', 3),
        (p_user_id, 'Railway', 'Railway recruitment materials', '#F59E0B', 'train', 4),
        (p_user_id, 'Teaching', 'Teaching exams (CTET, TET)', '#8B5CF6', 'class', 5),
        (p_user_id, 'Saved', 'Saved for later', '#6B7280', 'bookmark', 6)
    ON CONFLICT (user_id, name) DO NOTHING;
END;
$$;