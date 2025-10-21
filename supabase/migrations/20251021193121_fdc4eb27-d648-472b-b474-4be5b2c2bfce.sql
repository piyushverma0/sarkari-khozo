-- Add push subscription storage to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS push_subscription JSONB;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_push_subscription 
ON public.profiles USING GIN (push_subscription);