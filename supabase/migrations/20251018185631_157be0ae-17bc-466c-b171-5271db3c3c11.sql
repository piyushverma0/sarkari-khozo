-- Create program_feedback table for user feedback on programs
CREATE TABLE public.program_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  program_title TEXT NOT NULL,
  program_url TEXT,
  is_relevant BOOLEAN,
  did_apply TEXT CHECK (did_apply IN ('yes', 'no', 'planning')),
  feedback_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.program_feedback ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can create own feedback" 
ON public.program_feedback 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own feedback" 
ON public.program_feedback 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own feedback" 
ON public.program_feedback 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_program_feedback_user_id ON public.program_feedback(user_id);
CREATE INDEX idx_program_feedback_created_at ON public.program_feedback(created_at DESC);