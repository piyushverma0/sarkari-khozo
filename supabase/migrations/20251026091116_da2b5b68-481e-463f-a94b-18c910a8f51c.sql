-- Add view tracking columns to applications table
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_viewed_at timestamp with time zone;

-- Create application_views tracking table
CREATE TABLE IF NOT EXISTS application_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id uuid REFERENCES applications(id) ON DELETE CASCADE,
  viewed_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, application_id)
);

-- Enable RLS
ALTER TABLE application_views ENABLE ROW LEVEL SECURITY;

-- RLS policies for application_views
CREATE POLICY "Users can view own application views"
ON application_views FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own application views"
ON application_views FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_application_views_application_id ON application_views(application_id);
CREATE INDEX IF NOT EXISTS idx_application_views_user_id ON application_views(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_view_count ON applications(view_count DESC);