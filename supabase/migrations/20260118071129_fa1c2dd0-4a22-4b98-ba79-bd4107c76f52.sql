-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can read their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can read collaborator profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

-- Policy 1: Read own profile (user_profiles.user_id is UUID type)
CREATE POLICY "Users can read their own profile"
ON user_profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Policy 2: Read profiles of collaborators
CREATE POLICY "Users can read collaborator profiles"
ON user_profiles FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM note_collaborators nc1
    WHERE nc1.user_id::uuid = auth.uid()
    AND nc1.status = 'active'
    AND EXISTS (
      SELECT 1 FROM note_collaborators nc2
      WHERE nc2.note_id = nc1.note_id
      AND nc2.user_id::uuid = user_profiles.user_id
      AND nc2.status = 'active'
    )
  )
  OR
  EXISTS (
    SELECT 1 FROM study_notes sn
    WHERE sn.user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM note_collaborators nc
      WHERE nc.note_id = sn.id
      AND nc.user_id::uuid = user_profiles.user_id
      AND nc.status = 'active'
    )
  )
);

-- Policy 3: Insert own profile
CREATE POLICY "Users can insert their own profile"
ON user_profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy 4: Update own profile
CREATE POLICY "Users can update their own profile"
ON user_profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);