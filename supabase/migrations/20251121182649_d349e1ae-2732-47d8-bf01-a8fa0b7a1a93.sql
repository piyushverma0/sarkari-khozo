-- Text highlights storage
CREATE TABLE note_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID REFERENCES study_notes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL,
  start_offset INT NOT NULL,
  end_offset INT NOT NULL,
  color VARCHAR(20) NOT NULL,
  text_content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_offsets CHECK (end_offset > start_offset)
);

CREATE INDEX idx_highlights_note ON note_highlights(note_id);
CREATE INDEX idx_highlights_user ON note_highlights(user_id);

-- AI explanations cache
CREATE TABLE ai_explanations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID REFERENCES study_notes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  selected_text TEXT NOT NULL,
  context_before TEXT,
  context_after TEXT,
  explanation_text TEXT NOT NULL,
  explanation_json JSONB,
  language VARCHAR(10) DEFAULT 'en',
  model_version VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  cache_hits INT DEFAULT 0,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_explanations_text_hash ON ai_explanations(md5(selected_text));
CREATE INDEX idx_explanations_note ON ai_explanations(note_id);

-- Collaboration: Note shares & permissions
CREATE TABLE note_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID REFERENCES study_notes(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  collaborator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_level VARCHAR(20) NOT NULL,
  invitation_status VARCHAR(20) DEFAULT 'pending',
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  
  UNIQUE(note_id, collaborator_id)
);

CREATE INDEX idx_collaborators_note ON note_collaborators(note_id);
CREATE INDEX idx_collaborators_user ON note_collaborators(collaborator_id);

-- Text edit history
CREATE TABLE note_edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID REFERENCES study_notes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  section_id TEXT NOT NULL,
  previous_content TEXT,
  new_content TEXT,
  edit_type VARCHAR(20),
  edited_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_edit_history_note ON note_edit_history(note_id);
CREATE INDEX idx_edit_history_time ON note_edit_history(edited_at DESC);

-- Real-time quiz/flashcard sessions
CREATE TABLE collaborative_quiz_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID REFERENCES study_notes(id),
  host_user_id UUID REFERENCES auth.users(id),
  session_type VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'waiting',
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  settings JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quiz_sessions_host ON collaborative_quiz_sessions(host_user_id);
CREATE INDEX idx_quiz_sessions_status ON collaborative_quiz_sessions(status);

-- Session participants & scores
CREATE TABLE session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES collaborative_quiz_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  score INT DEFAULT 0,
  correct_answers INT DEFAULT 0,
  total_answers INT DEFAULT 0,
  current_streak INT DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_answer_at TIMESTAMPTZ,
  
  UNIQUE(session_id, user_id)
);

CREATE INDEX idx_participants_session ON session_participants(session_id);
CREATE INDEX idx_participants_user ON session_participants(user_id);

-- Live answer tracking for leaderboard updates
CREATE TABLE session_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES collaborative_quiz_sessions(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES session_participants(id) ON DELETE CASCADE,
  question_id UUID,
  answer_text TEXT,
  is_correct BOOLEAN,
  time_taken_ms INT,
  answered_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_answers_session ON session_answers(session_id);
CREATE INDEX idx_answers_participant ON session_answers(participant_id);

-- Friends/connections
CREATE TABLE user_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, friend_id),
  CHECK(user_id != friend_id)
);

CREATE INDEX idx_connections_user ON user_connections(user_id);
CREATE INDEX idx_connections_friend ON user_connections(friend_id);
CREATE INDEX idx_connections_status ON user_connections(status);

-- Now enable RLS and create policies for all tables

-- note_highlights RLS
ALTER TABLE note_highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own highlights"
  ON note_highlights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own highlights"
  ON note_highlights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own highlights"
  ON note_highlights FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own highlights"
  ON note_highlights FOR DELETE
  USING (auth.uid() = user_id);

-- ai_explanations RLS
ALTER TABLE ai_explanations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view explanations for their notes"
  ON ai_explanations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM study_notes 
      WHERE study_notes.id = ai_explanations.note_id 
      AND study_notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert explanations for their notes"
  ON ai_explanations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM study_notes 
      WHERE study_notes.id = ai_explanations.note_id 
      AND study_notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update explanations cache hits"
  ON ai_explanations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM study_notes 
      WHERE study_notes.id = ai_explanations.note_id 
      AND study_notes.user_id = auth.uid()
    )
  );

-- note_collaborators RLS
ALTER TABLE note_collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view collaborations they're part of"
  ON note_collaborators FOR SELECT
  USING (auth.uid() = owner_id OR auth.uid() = collaborator_id);

CREATE POLICY "Note owners can invite collaborators"
  ON note_collaborators FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id AND
    EXISTS (
      SELECT 1 FROM study_notes 
      WHERE study_notes.id = note_collaborators.note_id 
      AND study_notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and collaborators can update invitations"
  ON note_collaborators FOR UPDATE
  USING (auth.uid() = owner_id OR auth.uid() = collaborator_id);

CREATE POLICY "Owners can remove collaborators"
  ON note_collaborators FOR DELETE
  USING (auth.uid() = owner_id);

-- note_edit_history RLS
ALTER TABLE note_edit_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view edit history for their notes"
  ON note_edit_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM study_notes 
      WHERE study_notes.id = note_edit_history.note_id 
      AND study_notes.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM note_collaborators
      WHERE note_collaborators.note_id = note_edit_history.note_id
      AND note_collaborators.collaborator_id = auth.uid()
      AND note_collaborators.invitation_status = 'accepted'
    )
  );

CREATE POLICY "Users can insert edit history for their notes"
  ON note_edit_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- collaborative_quiz_sessions RLS
ALTER TABLE collaborative_quiz_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sessions they host or participate in"
  ON collaborative_quiz_sessions FOR SELECT
  USING (
    auth.uid() = host_user_id OR
    EXISTS (
      SELECT 1 FROM session_participants
      WHERE session_participants.session_id = collaborative_quiz_sessions.id
      AND session_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create quiz sessions"
  ON collaborative_quiz_sessions FOR INSERT
  WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Hosts can update their sessions"
  ON collaborative_quiz_sessions FOR UPDATE
  USING (auth.uid() = host_user_id);

-- session_participants RLS
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view participants in accessible sessions"
  ON session_participants FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM collaborative_quiz_sessions
      WHERE collaborative_quiz_sessions.id = session_participants.session_id
      AND collaborative_quiz_sessions.host_user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM session_participants sp
      WHERE sp.session_id = session_participants.session_id
      AND sp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join sessions"
  ON session_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation"
  ON session_participants FOR UPDATE
  USING (auth.uid() = user_id);

-- session_answers RLS
ALTER TABLE session_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view answers in their sessions"
  ON session_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM session_participants
      WHERE session_participants.id = session_answers.participant_id
      AND session_participants.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM collaborative_quiz_sessions cqs
      JOIN session_participants sp ON sp.session_id = cqs.id
      WHERE sp.id = session_answers.participant_id
      AND cqs.host_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own answers"
  ON session_answers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM session_participants
      WHERE session_participants.id = session_answers.participant_id
      AND session_participants.user_id = auth.uid()
    )
  );

-- user_connections RLS
ALTER TABLE user_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own connections"
  ON user_connections FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can send friend requests"
  ON user_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update connection status"
  ON user_connections FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can delete their connections"
  ON user_connections FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Triggers for updated_at timestamps
CREATE TRIGGER update_note_highlights_updated_at
    BEFORE UPDATE ON note_highlights
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();