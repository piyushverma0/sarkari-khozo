-- Create teach_me_sessions table for Socratic teaching mode

CREATE TABLE IF NOT EXISTS public.teach_me_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    note_id UUID NOT NULL REFERENCES public.study_notes(id) ON DELETE CASCADE,
    -- Session metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    current_step INTEGER NOT NULL DEFAULT 1,
    total_steps INTEGER NOT NULL DEFAULT 6,
    -- Step data (JSON array of steps)
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Exam-focused tracking
    exam_tags TEXT[] NOT NULL DEFAULT '{}',
    concept_weak_areas TEXT[] NOT NULL DEFAULT '{}',
    writing_weak_areas TEXT[] NOT NULL DEFAULT '{}',
    exam_mistake_areas TEXT[] NOT NULL DEFAULT '{}',
    -- Completion summary
    exam_risk_areas JSONB,
    recommended_revision JSONB,
    performance_breakdown JSONB,
    -- Constraints
    CONSTRAINT valid_step_range CHECK (current_step >= 1 AND current_step <= total_steps),
    CONSTRAINT completed_has_timestamp CHECK (
        (is_completed = true AND completed_at IS NOT NULL) OR
        (is_completed = false)
    )
);

-- Create indexes for performance
CREATE INDEX idx_teach_me_sessions_user_id ON public.teach_me_sessions(user_id);
CREATE INDEX idx_teach_me_sessions_note_id ON public.teach_me_sessions(note_id);
CREATE INDEX idx_teach_me_sessions_created_at ON public.teach_me_sessions(created_at DESC);
CREATE INDEX idx_teach_me_sessions_is_completed ON public.teach_me_sessions(is_completed);

-- Enable Row Level Security
ALTER TABLE public.teach_me_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only read their own sessions
CREATE POLICY "Users can view own teach_me_sessions"
    ON public.teach_me_sessions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can only insert their own sessions
CREATE POLICY "Users can create own teach_me_sessions"
    ON public.teach_me_sessions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can only update their own sessions
CREATE POLICY "Users can update own teach_me_sessions"
    ON public.teach_me_sessions
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own sessions
CREATE POLICY "Users can delete own teach_me_sessions"
    ON public.teach_me_sessions
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_teach_me_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-update updated_at
CREATE TRIGGER teach_me_sessions_updated_at
    BEFORE UPDATE ON public.teach_me_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_teach_me_sessions_updated_at();