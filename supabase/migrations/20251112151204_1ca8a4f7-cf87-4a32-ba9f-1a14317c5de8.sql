-- Create storage bucket for study materials
INSERT INTO storage.buckets (id, name, public)
VALUES ('study-materials', 'study-materials', false)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies
CREATE POLICY "Users can upload their own study materials"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'study-materials' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own study materials"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'study-materials' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own study materials"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'study-materials' AND
    (storage.foldername(name))[1] = auth.uid()::text
);