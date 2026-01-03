-- Create onboarding_preferences table
CREATE TABLE IF NOT EXISTS public.onboarding_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    -- Step 1: Profile Type
    profile_type TEXT NOT NULL,
    -- Step 2: Exam Goals (array)
    exam_goals TEXT[] NOT NULL DEFAULT '{}',
    -- Step 3: Education Level
    education_level TEXT NOT NULL,
    -- Step 4: Study Hours
    daily_study_hours TEXT NOT NULL,
    -- Step 5: Target Timeline
    target_timeline TEXT NOT NULL,
    -- Step 6: Subject Interests (array)
    subject_interests TEXT[] NOT NULL DEFAULT '{}',
    -- Step 7: Language Preference
    preferred_language TEXT NOT NULL,
    -- Metadata
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    -- Constraints
    UNIQUE(user_id) -- One preference row per user
);

-- Create index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_onboarding_preferences_user_id
    ON public.onboarding_preferences(user_id);

-- Enable Row Level Security
ALTER TABLE public.onboarding_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only read their own preferences
CREATE POLICY "Users can read own onboarding preferences"
    ON public.onboarding_preferences FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policies: Users can insert their own preferences
CREATE POLICY "Users can insert own onboarding preferences"
    ON public.onboarding_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies: Users can update their own preferences
CREATE POLICY "Users can update own onboarding preferences"
    ON public.onboarding_preferences FOR UPDATE
    USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_onboarding_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_onboarding_preferences_updated_at_trigger
    BEFORE UPDATE ON public.onboarding_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_onboarding_preferences_updated_at();