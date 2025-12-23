-- Create Mock Test (Exam Paper) tables for AI-powered exam generation
-- Supports CBSE, UPSC, SSC, Railway, JEE, NEET, Banking, and other competitive exams

-- =============================================================================
-- EXAM PAPERS TABLE
-- =============================================================================
-- Stores generated exam papers with metadata and structure

CREATE TABLE IF NOT EXISTS public.exam_papers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    note_id UUID REFERENCES public.study_notes(id) ON DELETE SET NULL,
    
    -- Exam metadata
    exam_type TEXT NOT NULL, -- 'CBSE', 'UPSC', 'SSC', 'Railway', 'JEE', 'NEET', 'UP_Board', 'Banking', 'State_PSC', 'Other'
    subject TEXT NOT NULL,
    class_level TEXT, -- '10', '12', 'Graduate', NULL for competitive exams
    duration_minutes INTEGER NOT NULL,
    total_marks INTEGER NOT NULL,
    
    -- Generation data (JSONB for flexibility)
    exam_outline JSONB NOT NULL DEFAULT '{}'::jsonb, -- Phase 1 output: exam structure
    formatted_paper JSONB NOT NULL DEFAULT '{}'::jsonb, -- Phase 3 output: complete formatted paper
    
    -- Status tracking
    generation_status TEXT NOT NULL DEFAULT 'generating', -- 'generating', 'ready', 'failed'
    current_phase INTEGER DEFAULT 1, -- 1 (outline), 2 (questions), 3 (formatting)
    error_message TEXT, -- Error details if generation fails
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    generated_at TIMESTAMPTZ, -- When all 3 phases complete
    
    -- Constraints
    CONSTRAINT valid_phase CHECK (current_phase >= 1 AND current_phase <= 3),
    CONSTRAINT valid_status CHECK (generation_status IN ('generating', 'ready', 'failed')),
    CONSTRAINT valid_duration CHECK (duration_minutes > 0),
    CONSTRAINT valid_marks CHECK (total_marks > 0)
);

-- Create indexes for performance
CREATE INDEX idx_exam_papers_user_id ON public.exam_papers(user_id);
CREATE INDEX idx_exam_papers_note_id ON public.exam_papers(note_id);
CREATE INDEX idx_exam_papers_status ON public.exam_papers(generation_status);
CREATE INDEX idx_exam_papers_type ON public.exam_papers(exam_type);
CREATE INDEX idx_exam_papers_created_at ON public.exam_papers(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.exam_papers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for exam_papers
CREATE POLICY "Users can view own exam_papers"
    ON public.exam_papers
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own exam_papers"
    ON public.exam_papers
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exam_papers"
    ON public.exam_papers
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own exam_papers"
    ON public.exam_papers
    FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================================================
-- EXAM ATTEMPTS TABLE
-- =============================================================================
-- Stores user attempts at exam papers with answers and grading results

CREATE TABLE IF NOT EXISTS public.exam_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_paper_id UUID NOT NULL REFERENCES public.exam_papers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    
    -- Attempt data
    user_answers JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of {question_number, answer}
    
    -- Status
    status TEXT NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'submitted', 'graded'
    
    -- Grading results (filled after grading)
    grading_result JSONB, -- Complete grading output with feedback
    total_marks_obtained DECIMAL(6,2), -- e.g., 65.5
    percentage DECIMAL(5,2), -- e.g., 81.88
    grade TEXT, -- 'A1', 'A', 'B+', etc.
    
    -- Timestamps
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    submitted_at TIMESTAMPTZ,
    graded_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_attempt_status CHECK (status IN ('in_progress', 'submitted', 'graded'))
);

-- Create indexes for performance
CREATE INDEX idx_exam_attempts_exam_paper_id ON public.exam_attempts(exam_paper_id);
CREATE INDEX idx_exam_attempts_user_id ON public.exam_attempts(user_id);
CREATE INDEX idx_exam_attempts_status ON public.exam_attempts(status);
CREATE INDEX idx_exam_attempts_started_at ON public.exam_attempts(started_at DESC);

-- Enable Row Level Security
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for exam_attempts
CREATE POLICY "Users can view own exam_attempts"
    ON public.exam_attempts
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own exam_attempts"
    ON public.exam_attempts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exam_attempts"
    ON public.exam_attempts
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own exam_attempts"
    ON public.exam_attempts
    FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-update updated_at timestamp on exam_papers
CREATE OR REPLACE FUNCTION update_exam_papers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER exam_papers_updated_at
    BEFORE UPDATE ON public.exam_papers
    FOR EACH ROW
    EXECUTE FUNCTION update_exam_papers_updated_at();

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE public.exam_papers IS
    'Stores AI-generated exam papers (mock tests) with metadata and structure. Supports multi-phase generation: outline → questions → formatting.';

COMMENT ON COLUMN public.exam_papers.exam_outline IS
    'Phase 1 output: Exam structure with sections, topic distribution, instructions, and metadata.';

COMMENT ON COLUMN public.exam_papers.formatted_paper IS
    'Phase 3 output: Complete formatted exam paper with all questions, headers, and instructions ready for user attempt.';

COMMENT ON COLUMN public.exam_papers.generation_status IS
    'Generation status: generating (in progress), ready (all phases complete), failed (error occurred).';

COMMENT ON COLUMN public.exam_papers.current_phase IS
    'Current generation phase: 1 (outline), 2 (questions), 3 (formatting). Moves to next phase automatically.';

COMMENT ON TABLE public.exam_attempts IS
    'Stores user attempts at exam papers with answers and AI grading results. One exam paper can have multiple attempts.';

COMMENT ON COLUMN public.exam_attempts.user_answers IS
    'Array of user answers: [{question_number: 1, answer: "user response"}, ...]. Stored as JSONB for flexibility.';

COMMENT ON COLUMN public.exam_attempts.grading_result IS
    'Complete AI grading output with question-wise feedback, section scores, and overall analysis.';