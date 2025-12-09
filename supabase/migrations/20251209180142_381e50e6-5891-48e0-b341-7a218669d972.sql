-- Create user_feature_usage table
CREATE TABLE public.user_feature_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    
    -- Feature usage tracking (for free tries)
    pdf_notes_count INT DEFAULT 0,
    docx_notes_count INT DEFAULT 0,
    youtube_notes_count INT DEFAULT 0,
    article_notes_count INT DEFAULT 0,
    record_lecture_count INT DEFAULT 0,
    upload_audio_count INT DEFAULT 0,
    
    -- First use dates (for analytics)
    pdf_notes_first_used_at TIMESTAMPTZ,
    youtube_notes_first_used_at TIMESTAMPTZ,
    record_lecture_first_used_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user lookup
CREATE INDEX idx_user_feature_usage_user_id ON public.user_feature_usage(user_id);

-- Enable Row Level Security
ALTER TABLE public.user_feature_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own feature usage"
ON public.user_feature_usage
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feature usage"
ON public.user_feature_usage
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feature usage"
ON public.user_feature_usage
FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_feature_usage_updated_at
BEFORE UPDATE ON public.user_feature_usage
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();