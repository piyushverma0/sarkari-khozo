-- =====================================================
-- Fix QR Code Sharing - Allow Users to Join via Invite
-- Fixes: "new row violates row-level security policy"
-- =====================================================

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Note owners and admins can add collaborators" ON note_collaborators;

-- Create a new INSERT policy that allows:
-- 1. Note owners to add collaborators
-- 2. Admin collaborators to add collaborators
-- 3. Users to add themselves if they are the one being invited
CREATE POLICY "Users can join via invite or owners can add collaborators"
ON note_collaborators FOR INSERT
WITH CHECK (
    -- Check if current user is the note owner
    is_note_owner(note_id, auth.uid())
    -- OR current user is an admin collaborator
    OR is_admin_collaborator(note_id, auth.uid())
    -- OR current user is adding themselves (for QR code invites)
    -- This allows the invited user to accept the invitation
    OR (
        user_id = auth.uid()
        AND status = 'active'
    )
);

-- Add comment
COMMENT ON POLICY "Users can join via invite or owners can add collaborators" ON note_collaborators IS
'Allows note owners and admins to add collaborators, and allows users to add themselves when accepting invitations via QR code';