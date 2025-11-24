-- =====================================================
-- Phase 5: Collaboration Feature
-- Tables for note sharing, invites, and presence tracking
-- =====================================================

-- Drop existing tables to recreate with new schema
DROP TABLE IF EXISTS note_collaborators CASCADE;
DROP TABLE IF EXISTS collaboration_invites CASCADE;
DROP TABLE IF EXISTS text_highlights CASCADE;
DROP TABLE IF EXISTS edit_history CASCADE;

-- Table: note_collaborators
-- Stores users who have access to shared notes
CREATE TABLE note_collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES study_notes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    permission TEXT NOT NULL CHECK (permission IN ('view', 'edit', 'admin')),
    invited_by UUID NOT NULL,
    invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'removed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(note_id, user_id)
);

CREATE INDEX idx_note_collaborators_note_id ON note_collaborators(note_id);
CREATE INDEX idx_note_collaborators_user_id ON note_collaborators(user_id);
CREATE INDEX idx_note_collaborators_status ON note_collaborators(status);

-- Table: collaboration_invites
-- Stores QR code invitation links for sharing notes
CREATE TABLE collaboration_invites (
    invite_code UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES study_notes(id) ON DELETE CASCADE,
    created_by UUID NOT NULL,
    permission TEXT NOT NULL CHECK (permission IN ('view', 'edit')),
    expires_at TIMESTAMPTZ NOT NULL,
    max_uses INTEGER,
    used_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (max_uses IS NULL OR max_uses > 0),
    CHECK (used_count >= 0)
);

CREATE INDEX idx_collaboration_invites_note_id ON collaboration_invites(note_id);
CREATE INDEX idx_collaboration_invites_created_by ON collaboration_invites(created_by);
CREATE INDEX idx_collaboration_invites_expires_at ON collaboration_invites(expires_at);

-- Table: text_highlights
-- Stores user highlights on shared notes
CREATE TABLE text_highlights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES study_notes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    text_content TEXT NOT NULL,
    start_offset INTEGER NOT NULL,
    end_offset INTEGER NOT NULL,
    color TEXT NOT NULL CHECK (color IN ('yellow', 'green', 'blue', 'pink', 'orange')),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_offset > start_offset)
);

CREATE INDEX idx_text_highlights_note_id ON text_highlights(note_id);
CREATE INDEX idx_text_highlights_user_id ON text_highlights(user_id);

-- Table: edit_history
-- Tracks changes made to shared notes for version control
CREATE TABLE edit_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES study_notes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    edit_type TEXT NOT NULL CHECK (edit_type IN ('content_edit', 'title_edit', 'section_add', 'section_delete', 'highlight_add', 'highlight_remove')),
    old_content TEXT,
    new_content TEXT,
    section_path TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_edit_history_note_id ON edit_history(note_id);
CREATE INDEX idx_edit_history_user_id ON edit_history(user_id);
CREATE INDEX idx_edit_history_created_at ON edit_history(created_at DESC);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

ALTER TABLE note_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborator_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE text_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE edit_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for note_collaborators
CREATE POLICY "Users can view collaborators of their notes"
ON note_collaborators FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM study_notes
        WHERE study_notes.id = note_collaborators.note_id
        AND study_notes.user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM note_collaborators nc
        WHERE nc.note_id = note_collaborators.note_id
        AND nc.user_id = auth.uid()
        AND nc.status = 'active'
    )
);

CREATE POLICY "Note owners and admins can add collaborators"
ON note_collaborators FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM study_notes
        WHERE study_notes.id = note_id
        AND study_notes.user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM note_collaborators nc
        WHERE nc.note_id = note_collaborators.note_id
        AND nc.user_id = auth.uid()
        AND nc.permission = 'admin'
        AND nc.status = 'active'
    )
);

CREATE POLICY "Note owners and admins can update collaborators"
ON note_collaborators FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM study_notes
        WHERE study_notes.id = note_id
        AND study_notes.user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM note_collaborators nc
        WHERE nc.note_id = note_collaborators.note_id
        AND nc.user_id = auth.uid()
        AND nc.permission = 'admin'
        AND nc.status = 'active'
    )
);

CREATE POLICY "Note owners and admins can remove collaborators"
ON note_collaborators FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM study_notes
        WHERE study_notes.id = note_id
        AND study_notes.user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM note_collaborators nc
        WHERE nc.note_id = note_collaborators.note_id
        AND nc.user_id = auth.uid()
        AND nc.permission = 'admin'
        AND nc.status = 'active'
    )
);

-- RLS Policies for collaboration_invites
CREATE POLICY "Users can view invites for their notes"
ON collaboration_invites FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM study_notes
        WHERE study_notes.id = collaboration_invites.note_id
        AND study_notes.user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM note_collaborators
        WHERE note_collaborators.note_id = collaboration_invites.note_id
        AND note_collaborators.user_id = auth.uid()
        AND note_collaborators.permission = 'admin'
        AND note_collaborators.status = 'active'
    )
);

CREATE POLICY "Note owners and admins can create invites"
ON collaboration_invites FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM study_notes
        WHERE study_notes.id = note_id
        AND study_notes.user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM note_collaborators
        WHERE note_collaborators.note_id = collaboration_invites.note_id
        AND note_collaborators.user_id = auth.uid()
        AND note_collaborators.permission = 'admin'
        AND note_collaborators.status = 'active'
    )
);

CREATE POLICY "Note owners and admins can delete invites"
ON collaboration_invites FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM study_notes
        WHERE study_notes.id = note_id
        AND study_notes.user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM note_collaborators
        WHERE note_collaborators.note_id = collaboration_invites.note_id
        AND note_collaborators.user_id = auth.uid()
        AND note_collaborators.permission = 'admin'
        AND note_collaborators.status = 'active'
    )
);

-- RLS Policies for collaborator_presence
CREATE POLICY "Users can view presence on shared notes"
ON collaborator_presence FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM study_notes
        WHERE study_notes.id = collaborator_presence.note_id
        AND study_notes.user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM note_collaborators
        WHERE note_collaborators.note_id = collaborator_presence.note_id
        AND note_collaborators.user_id = auth.uid()
        AND note_collaborators.status = 'active'
    )
);

CREATE POLICY "Users can update their own presence"
ON collaborator_presence FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own presence timestamp"
ON collaborator_presence FOR UPDATE
USING (user_id = auth.uid());

-- RLS Policies for text_highlights
CREATE POLICY "Users can view highlights on accessible notes"
ON text_highlights FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM study_notes
        WHERE study_notes.id = text_highlights.note_id
        AND study_notes.user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM note_collaborators
        WHERE note_collaborators.note_id = text_highlights.note_id
        AND note_collaborators.user_id = auth.uid()
        AND note_collaborators.status = 'active'
    )
);

CREATE POLICY "Users can create highlights on accessible notes"
ON text_highlights FOR INSERT
WITH CHECK (
    user_id = auth.uid()
    AND (
        EXISTS (
            SELECT 1 FROM study_notes
            WHERE study_notes.id = note_id
            AND study_notes.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM note_collaborators
            WHERE note_collaborators.note_id = text_highlights.note_id
            AND note_collaborators.user_id = auth.uid()
            AND note_collaborators.status = 'active'
        )
    )
);

CREATE POLICY "Users can update their own highlights"
ON text_highlights FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own highlights"
ON text_highlights FOR DELETE
USING (user_id = auth.uid());

-- RLS Policies for edit_history
CREATE POLICY "Users can view edit history of accessible notes"
ON edit_history FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM study_notes
        WHERE study_notes.id = edit_history.note_id
        AND study_notes.user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM note_collaborators
        WHERE note_collaborators.note_id = edit_history.note_id
        AND note_collaborators.user_id = auth.uid()
        AND note_collaborators.status = 'active'
    )
);

CREATE POLICY "System can insert edit history"
ON edit_history FOR INSERT
WITH CHECK (true);

-- =====================================================
-- Functions and Triggers
-- =====================================================

-- Trigger to auto-update updated_at for note_collaborators
DROP TRIGGER IF EXISTS update_note_collaborators_updated_at ON note_collaborators;
CREATE TRIGGER update_note_collaborators_updated_at
    BEFORE UPDATE ON note_collaborators
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-update updated_at for text_highlights
DROP TRIGGER IF EXISTS update_text_highlights_updated_at ON text_highlights;
CREATE TRIGGER update_text_highlights_updated_at
    BEFORE UPDATE ON text_highlights
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired invites
CREATE OR REPLACE FUNCTION cleanup_expired_invites()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM collaboration_invites
    WHERE expires_at < NOW();
END;
$$;

-- Function to validate invite and increment usage
CREATE OR REPLACE FUNCTION use_collaboration_invite(p_invite_code UUID)
RETURNS TABLE(
    note_id UUID,
    permission TEXT,
    is_valid BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invite RECORD;
BEGIN
    SELECT * INTO v_invite
    FROM collaboration_invites
    WHERE invite_code = p_invite_code;

    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::UUID, NULL::TEXT, FALSE, 'Invalid invite code';
        RETURN;
    END IF;

    IF v_invite.expires_at < NOW() THEN
        RETURN QUERY SELECT NULL::UUID, NULL::TEXT, FALSE, 'Invite has expired';
        RETURN;
    END IF;

    IF v_invite.max_uses IS NOT NULL AND v_invite.used_count >= v_invite.max_uses THEN
        RETURN QUERY SELECT NULL::UUID, NULL::TEXT, FALSE, 'Invite has reached maximum uses';
        RETURN;
    END IF;

    UPDATE collaboration_invites
    SET used_count = used_count + 1
    WHERE invite_code = p_invite_code;

    RETURN QUERY SELECT v_invite.note_id, v_invite.permission, TRUE, 'Invite is valid';
END;
$$;

-- =====================================================
-- Realtime Publication
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE note_collaborators;
ALTER PUBLICATION supabase_realtime ADD TABLE collaborator_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE text_highlights;
ALTER PUBLICATION supabase_realtime ADD TABLE edit_history;