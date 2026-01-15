-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can read flashcards for accessible notes" ON note_flashcards;

-- Allow reading flashcards for notes the user can access
CREATE POLICY "Users can read flashcards for accessible notes"
ON note_flashcards
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM study_notes
    WHERE study_notes.id = note_flashcards.note_id
      AND (
        study_notes.user_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM note_collaborators
          WHERE note_collaborators.note_id = study_notes.id
            AND note_collaborators.user_id = auth.uid()
            AND note_collaborators.status = 'active'
        )
      )
  )
);

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can read quizzes for accessible notes" ON note_quizzes;

-- Allow reading quizzes for notes the user can access
CREATE POLICY "Users can read quizzes for accessible notes"
ON note_quizzes
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM study_notes
    WHERE study_notes.id = note_quizzes.note_id
      AND (
        study_notes.user_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM note_collaborators
          WHERE note_collaborators.note_id = study_notes.id
            AND note_collaborators.user_id = auth.uid()
            AND note_collaborators.status = 'active'
        )
      )
  )
);