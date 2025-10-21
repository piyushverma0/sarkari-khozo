-- Create scheme_stats table for application volume data
CREATE TABLE public.scheme_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  year integer NOT NULL,
  applicants_count bigint,
  vacancies integer,
  competition_ratio text,
  data_source text,
  data_confidence text CHECK (data_confidence IN ('verified', 'estimated', 'community')),
  confidence_score numeric(3,2),
  source_quote text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(application_id, year)
);

-- Enable RLS
ALTER TABLE public.scheme_stats ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view stats (public data)
CREATE POLICY "Anyone can view scheme stats"
ON public.scheme_stats
FOR SELECT
USING (true);

-- Allow authenticated users to insert stats (for community contributions)
CREATE POLICY "Authenticated users can insert stats"
ON public.scheme_stats
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to update stats they created (based on applications they own)
CREATE POLICY "Users can update stats for their applications"
ON public.scheme_stats
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.applications
    WHERE applications.id = scheme_stats.application_id
    AND applications.user_id = auth.uid()
  )
);

-- Create index for better query performance
CREATE INDEX idx_scheme_stats_application_id ON public.scheme_stats(application_id);
CREATE INDEX idx_scheme_stats_year ON public.scheme_stats(year DESC);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_scheme_stats_updated_at
BEFORE UPDATE ON public.scheme_stats
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();