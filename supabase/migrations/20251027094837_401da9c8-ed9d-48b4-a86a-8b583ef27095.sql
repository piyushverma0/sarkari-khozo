-- Enable realtime for discovery_stories table
ALTER TABLE public.discovery_stories REPLICA IDENTITY FULL;

-- Add discovery_stories to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.discovery_stories;