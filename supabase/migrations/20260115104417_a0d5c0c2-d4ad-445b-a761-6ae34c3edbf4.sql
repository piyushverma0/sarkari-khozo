-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can read notes they own or collaborate on" ON study_notes;

-- Create new policy that allows both owners and collaborators to read notes
CREATE POLICY "Users can read notes they own or collaborate on"
ON study_notes
FOR SELECT
USING (
  -- Allow if user is the owner
  auth.uid() = user_id
  OR
  -- Allow if user is an active collaborator
  EXISTS (
    SELECT 1
    FROM note_collaborators
    WHERE note_collaborators.note_id = study_notes.id
      AND note_collaborators.user_id = auth.uid()
      AND note_collaborators.status = 'active'
  )
);