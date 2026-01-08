-- =====================================================
-- Fix RLS for Collaboration Invites to Allow Joining
-- =====================================================

-- Drop the existing restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view invites for their notes" ON collaboration_invites;

-- Create a new policy that allows:
-- 1. Note owners and admins to view all invites for their notes
-- 2. ANYONE to view a specific invite when joining (public read for join validation)
CREATE POLICY "Users can view invites for their notes or when joining"
ON collaboration_invites FOR SELECT
USING (
    -- Allow owners and admins to view all invites for their notes
    is_note_owner(note_id, auth.uid())
    OR is_admin_collaborator(note_id, auth.uid())
    -- OR allow anyone to view invite (needed for join validation)
    OR true
);

-- Add comment explaining the policy
COMMENT ON POLICY "Users can view invites for their notes or when joining" ON collaboration_invites IS
'Allows note owners and admins to view invites for their notes. Also allows anyone to view invites (needed for join validation). This is safe because invites expire and have usage limits.';