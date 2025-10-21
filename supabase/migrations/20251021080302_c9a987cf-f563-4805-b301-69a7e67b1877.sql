-- 1.1 Extend profiles table with location fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS saved_state TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS saved_district TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS saved_block TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMP WITH TIME ZONE;

-- 1.2 Create local_initiatives table
CREATE TABLE local_initiatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_title TEXT NOT NULL,
  category TEXT,
  state TEXT NOT NULL,
  district TEXT,
  block TEXT,
  description TEXT,
  mode TEXT,
  deadline DATE,
  apply_url TEXT,
  contact_info JSONB,
  source_url TEXT,
  confidence_level TEXT DEFAULT 'verified',
  last_verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE local_initiatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view local initiatives"
  ON local_initiatives FOR SELECT
  TO authenticated
  USING (true);

-- 1.3 Create local_check_queries table
CREATE TABLE local_check_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  program_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  state TEXT,
  district TEXT,
  block TEXT,
  results_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE local_check_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own queries"
  ON local_check_queries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own queries"
  ON local_check_queries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);