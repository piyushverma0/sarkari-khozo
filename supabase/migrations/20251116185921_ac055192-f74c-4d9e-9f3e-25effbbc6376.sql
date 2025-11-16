-- Create storage bucket for audio summaries
INSERT INTO storage.buckets (id, name, public)
VALUES ('study-audio-summaries', 'study-audio-summaries', false);

-- RLS policies for study-audio-summaries bucket
CREATE POLICY "Users can view their own audio files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'study-audio-summaries' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own audio files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'study-audio-summaries' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own audio files"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'study-audio-summaries' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own audio files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'study-audio-summaries' AND auth.uid()::text = (storage.foldername(name))[1]);