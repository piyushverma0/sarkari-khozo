-- Create audio_news_bulletins table
CREATE TABLE public.audio_news_bulletins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  audio_url TEXT,
  audio_base64 TEXT,
  story_ids UUID[] NOT NULL,
  language TEXT DEFAULT 'hi',
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient querying of active bulletins
CREATE INDEX idx_bulletins_active ON public.audio_news_bulletins(generated_at DESC) WHERE is_active = TRUE;

-- Create audio_news_scripts table
CREATE TABLE public.audio_news_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bulletin_id UUID REFERENCES public.audio_news_bulletins(id) ON DELETE CASCADE,
  story_id UUID REFERENCES public.discovery_stories(id) ON DELETE CASCADE,
  story_order INTEGER NOT NULL,
  hindi_script TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.audio_news_bulletins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_news_scripts ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Anyone can view active bulletins
CREATE POLICY "Anyone can view active bulletins"
  ON public.audio_news_bulletins
  FOR SELECT
  USING (is_active = true);

-- RLS Policies: Anyone can view scripts for active bulletins
CREATE POLICY "Anyone can view scripts"
  ON public.audio_news_scripts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.audio_news_bulletins
      WHERE audio_news_bulletins.id = audio_news_scripts.bulletin_id
      AND audio_news_bulletins.is_active = true
    )
  );