-- Add column to store cached local availability results for each application
ALTER TABLE public.applications 
ADD COLUMN local_availability_cache jsonb;

-- Add index for faster queries when checking if cache exists
CREATE INDEX idx_applications_local_cache ON public.applications(id) 
WHERE local_availability_cache IS NOT NULL;