-- Enable realtime for applications table
ALTER TABLE public.applications REPLICA IDENTITY FULL;

-- Add the applications table to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.applications;