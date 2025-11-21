-- Modify study_notes table for collaboration
ALTER TABLE study_notes
ADD COLUMN is_collaborative BOOLEAN DEFAULT FALSE,
ADD COLUMN edit_permissions VARCHAR(20) DEFAULT 'owner_only',
ADD COLUMN last_edited_by UUID REFERENCES auth.users(id),
ADD COLUMN last_edited_at TIMESTAMPTZ,
ADD COLUMN version_number INT DEFAULT 1;

-- Add index for collaborative notes
CREATE INDEX idx_study_notes_collaborative ON study_notes(is_collaborative, user_id);

-- Enable real-time on collaboration tables
ALTER PUBLICATION supabase_realtime ADD TABLE note_highlights;
ALTER PUBLICATION supabase_realtime ADD TABLE note_collaborators;
ALTER PUBLICATION supabase_realtime ADD TABLE collaborative_quiz_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE session_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE session_answers;
ALTER PUBLICATION supabase_realtime ADD TABLE note_edit_history;

-- Additional RLS policies for collaborative access

-- Note highlights: Users can see highlights on notes they have access to
DROP POLICY IF EXISTS "Users can view their own highlights" ON note_highlights;

CREATE POLICY "Users can view highlights on accessible notes"
ON note_highlights FOR SELECT
USING (
  user_id = auth.uid() 
  OR note_id IN (
    SELECT note_id FROM note_collaborators 
    WHERE collaborator_id = auth.uid() AND invitation_status = 'accepted'
  )
);

CREATE POLICY "Users can create their own highlights"
ON note_highlights FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Collaborators: Enhanced view policy
DROP POLICY IF EXISTS "Users can view collaborations they're part of" ON note_collaborators;

CREATE POLICY "Users can view their collaborations"
ON note_collaborators FOR SELECT
USING (collaborator_id = auth.uid() OR owner_id = auth.uid());

-- Quiz sessions: Enhanced participant view policy
DROP POLICY IF EXISTS "Users can view sessions they host or participate in" ON collaborative_quiz_sessions;

CREATE POLICY "View joined sessions"
ON collaborative_quiz_sessions FOR SELECT
USING (
  host_user_id = auth.uid() 
  OR id IN (SELECT session_id FROM session_participants WHERE user_id = auth.uid())
);

-- Study notes: Allow collaborators to view notes
CREATE POLICY "Collaborators can view shared notes"
ON study_notes FOR SELECT
USING (
  user_id = auth.uid()
  OR (
    is_collaborative = true 
    AND id IN (
      SELECT note_id FROM note_collaborators 
      WHERE collaborator_id = auth.uid() 
      AND invitation_status = 'accepted'
    )
  )
);

-- Study notes: Allow collaborators with edit permissions to update
CREATE POLICY "Collaborators can edit shared notes"
ON study_notes FOR UPDATE
USING (
  user_id = auth.uid()
  OR (
    is_collaborative = true 
    AND edit_permissions IN ('collaborators', 'public')
    AND id IN (
      SELECT note_id FROM note_collaborators 
      WHERE collaborator_id = auth.uid() 
      AND invitation_status = 'accepted'
      AND permission_level IN ('editor', 'co-owner')
    )
  )
);

-- Trigger to update last_edited tracking
CREATE OR REPLACE FUNCTION update_note_edit_tracking()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_edited_by = auth.uid();
  NEW.last_edited_at = NOW();
  NEW.version_number = OLD.version_number + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER track_note_edits
  BEFORE UPDATE ON study_notes
  FOR EACH ROW
  WHEN (OLD.structured_content IS DISTINCT FROM NEW.structured_content 
        OR OLD.raw_content IS DISTINCT FROM NEW.raw_content)
  EXECUTE FUNCTION update_note_edit_tracking();