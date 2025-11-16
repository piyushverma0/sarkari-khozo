-- Make study-audio-summaries bucket public for MediaPlayer access
UPDATE storage.buckets
SET public = true
WHERE id = 'study-audio-summaries';

-- Update RLS policy for public SELECT access
DROP POLICY IF EXISTS "Users can view their own audio files" ON storage.objects;

CREATE POLICY "Public audio access"
ON storage.objects
FOR SELECT
USING (bucket_id = 'study-audio-summaries');

-- Keep existing policies for INSERT/UPDATE/DELETE (users can only manage their own files)
-- These policies remain unchanged:
-- - "Users can upload their own audio files"
-- - "Users can update their own audio files"
-- - "Users can delete their own audio files"