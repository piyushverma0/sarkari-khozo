-- =====================================================
-- Fix Infinite Recursion in Collaboration RLS Policies
-- This migration fixes the circular dependency issues
-- =====================================================

-- Drop ALL existing policies from all collaboration tables
DROP POLICY IF EXISTS "Users can view collaborators of their notes" ON note_collaborators;
DROP POLICY IF EXISTS "Note owners and admins can add collaborators" ON note_collaborators;
DROP POLICY IF EXISTS "Note owners and admins can update collaborators" ON note_collaborators;
DROP POLICY IF EXISTS "Note owners and admins can remove collaborators" ON note_collaborators;

DROP POLICY IF EXISTS "Users can view invites for their notes" ON collaboration_invites;
DROP POLICY IF EXISTS "Note owners and admins can create invites" ON collaboration_invites;
DROP POLICY IF EXISTS "Note owners and admins can delete invites" ON collaboration_invites;

DROP POLICY IF EXISTS "Users can view presence on shared notes" ON collaborator_presence;
DROP POLICY IF EXISTS "Users can update their own presence" ON collaborator_presence;
DROP POLICY IF EXISTS "Users can update their own presence timestamp" ON collaborator_presence;

DROP POLICY IF EXISTS "Users can view highlights on accessible notes" ON text_highlights;
DROP POLICY IF EXISTS "Users can create highlights on accessible notes" ON text_highlights;
DROP POLICY IF EXISTS "Users can update their own highlights" ON text_highlights;
DROP POLICY IF EXISTS "Users can delete their own highlights" ON text_highlights;

DROP POLICY IF EXISTS "Users can view edit history of accessible notes" ON edit_history;
DROP POLICY IF EXISTS "System can insert edit history" ON edit_history;

-- =====================================================
-- Create security definer helper functions
-- These functions bypass RLS to check permissions
-- =====================================================

-- Function to check if user is note owner
CREATE OR REPLACE FUNCTION is_note_owner(p_note_id UUID, p_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM study_notes
        WHERE id = p_note_id
        AND user_id = p_user_id
    );
END;
$$;

-- Function to check if user is an active collaborator
CREATE OR REPLACE FUNCTION is_active_collaborator(p_note_id UUID, p_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM note_collaborators
        WHERE note_id = p_note_id
        AND user_id = p_user_id
        AND status = 'active'
    );
END;
$$;

-- Function to check if user is admin collaborator
CREATE OR REPLACE FUNCTION is_admin_collaborator(p_note_id UUID, p_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM note_collaborators
        WHERE note_id = p_note_id
        AND user_id = p_user_id
        AND permission = 'admin'
        AND status = 'active'
    );
END;
$$;

-- Function to check if user has access to note (owner or active collaborator)
CREATE OR REPLACE FUNCTION has_note_access(p_note_id UUID, p_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN is_note_owner(p_note_id, p_user_id)
        OR is_active_collaborator(p_note_id, p_user_id);
END;
$$;

-- ====================================================
-- Recreate RLS Policies for note_collaborators
-- Using security definer functions to avoid recursion
-- ====================================================

CREATE POLICY "Users can view collaborators of their notes"
ON note_collaborators FOR SELECT
USING (
    is_note_owner(note_id, auth.uid())
    OR is_active_collaborator(note_id, auth.uid())
);

CREATE POLICY "Note owners and admins can add collaborators"
ON note_collaborators FOR INSERT
WITH CHECK (
    is_note_owner(note_id, auth.uid())
    OR is_admin_collaborator(note_id, auth.uid())
);

CREATE POLICY "Note owners and admins can update collaborators"
ON note_collaborators FOR UPDATE
USING (
    is_note_owner(note_id, auth.uid())
    OR is_admin_collaborator(note_id, auth.uid())
);

CREATE POLICY "Note owners and admins can remove collaborators"
ON note_collaborators FOR DELETE
USING (
    is_note_owner(note_id, auth.uid())
    OR is_admin_collaborator(note_id, auth.uid())
);

-- ====================================================
-- Recreate RLS Policies for collaboration_invites
-- ====================================================

CREATE POLICY "Users can view invites for their notes"
ON collaboration_invites FOR SELECT
USING (
    is_note_owner(note_id, auth.uid())
    OR is_admin_collaborator(note_id, auth.uid())
);

CREATE POLICY "Note owners and admins can create invites"
ON collaboration_invites FOR INSERT
WITH CHECK (
    is_note_owner(note_id, auth.uid())
    OR is_admin_collaborator(note_id, auth.uid())
);

CREATE POLICY "Note owners and admins can delete invites"
ON collaboration_invites FOR DELETE
USING (
    is_note_owner(note_id, auth.uid())
    OR is_admin_collaborator(note_id, auth.uid())
);

-- ====================================================
-- Recreate RLS Policies for collaborator_presence
-- ====================================================

CREATE POLICY "Users can view presence on shared notes"
ON collaborator_presence FOR SELECT
USING (
    has_note_access(note_id, auth.uid())
);

CREATE POLICY "Users can update their own presence"
ON collaborator_presence FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own presence timestamp"
ON collaborator_presence FOR UPDATE
USING (user_id = auth.uid());

-- ====================================================
-- Recreate RLS Policies for text_highlights
-- ====================================================

CREATE POLICY "Users can view highlights on accessible notes"
ON text_highlights FOR SELECT
USING (
    has_note_access(note_id, auth.uid())
);

CREATE POLICY "Users can create highlights on accessible notes"
ON text_highlights FOR INSERT
WITH CHECK (
    user_id = auth.uid()
    AND has_note_access(note_id, auth.uid())
);

CREATE POLICY "Users can update their own highlights"
ON text_highlights FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own highlights"
ON text_highlights FOR DELETE
USING (user_id = auth.uid());

-- ====================================================
-- Recreate RLS Policies for edit_history
-- ====================================================

CREATE POLICY "Users can view edit history of accessible notes"
ON edit_history FOR SELECT
USING (
    has_note_access(note_id, auth.uid())
);

CREATE POLICY "System can insert edit history"
ON edit_history FOR INSERT
WITH CHECK (true);

-- =====================================================
-- Grant necessary permissions
-- =====================================================

GRANT EXECUTE ON FUNCTION is_note_owner(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_active_collaborator(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_collaborator(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_note_access(UUID, UUID) TO authenticated;

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON FUNCTION is_note_owner IS 'Security definer function to check if user owns a note';
COMMENT ON FUNCTION is_active_collaborator IS 'Security definer function to check if user is an active collaborator';
COMMENT ON FUNCTION is_admin_collaborator IS 'Security definer function to check if user is an admin collaborator';
COMMENT ON FUNCTION has_note_access IS 'Security definer function to check if user has access to a note';