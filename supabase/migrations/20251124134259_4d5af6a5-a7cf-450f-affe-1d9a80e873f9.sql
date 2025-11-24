-- =====================================================
-- Friendships Table Migration
-- Manages friend connections between users
-- =====================================================

-- Table: friendships
-- Stores friendship connections with their status
CREATE TABLE IF NOT EXISTS friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure users can't friend themselves
    CHECK (user_id != friend_id),

    -- Ensure no duplicate friendships (in either direction)
    UNIQUE(user_id, friend_id)
);

-- Indexes for friendships
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_friendships_created_at ON friendships(created_at DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_friendships_user_status ON friendships(user_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_status ON friendships(friend_id, status);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Users can view their own friendships (both directions)
CREATE POLICY "Users can view their own friendships"
ON friendships FOR SELECT
USING (
    user_id = auth.uid()
    OR friend_id = auth.uid()
);

-- Users can create friend requests (as the requester)
CREATE POLICY "Users can send friend requests"
ON friendships FOR INSERT
WITH CHECK (
    user_id = auth.uid()
    AND user_id != friend_id
);

-- Users can update friendships where they are the recipient
-- (for accepting/rejecting requests)
CREATE POLICY "Users can update received friend requests"
ON friendships FOR UPDATE
USING (
    friend_id = auth.uid()
);

-- Users can delete friendships they're part of
CREATE POLICY "Users can delete their friendships"
ON friendships FOR DELETE
USING (
    user_id = auth.uid()
    OR friend_id = auth.uid()
);

-- =====================================================
-- Functions and Triggers
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_friendships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_friendships_updated_at_trigger ON friendships;
CREATE TRIGGER update_friendships_updated_at_trigger
    BEFORE UPDATE ON friendships
    FOR EACH ROW
    EXECUTE FUNCTION update_friendships_updated_at();

-- Function to prevent duplicate friendships in opposite direction
CREATE OR REPLACE FUNCTION check_duplicate_friendship()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if friendship already exists in opposite direction
    IF EXISTS (
        SELECT 1 FROM friendships
        WHERE user_id = NEW.friend_id
        AND friend_id = NEW.user_id
    ) THEN
        RAISE EXCEPTION 'Friendship already exists in opposite direction';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent duplicate friendships
DROP TRIGGER IF EXISTS check_duplicate_friendship_trigger ON friendships;
CREATE TRIGGER check_duplicate_friendship_trigger
    BEFORE INSERT ON friendships
    FOR EACH ROW
    EXECUTE FUNCTION check_duplicate_friendship();

-- Function to get mutual friends count
CREATE OR REPLACE FUNCTION get_mutual_friends_count(
    p_user_id UUID,
    p_friend_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Get friends of first user
    WITH user_friends AS (
        SELECT
            CASE
                WHEN user_id = p_user_id THEN friend_id
                ELSE user_id
            END as friend
        FROM friendships
        WHERE (user_id = p_user_id OR friend_id = p_user_id)
        AND status = 'accepted'
    ),
    -- Get friends of second user
    friend_friends AS (
        SELECT
            CASE
                WHEN user_id = p_friend_id THEN friend_id
                ELSE user_id
            END as friend
        FROM friendships
        WHERE (user_id = p_friend_id OR friend_id = p_friend_id)
        AND status = 'accepted'
    )
    -- Count mutual friends
    SELECT COUNT(*)::INTEGER INTO v_count
    FROM user_friends
    INNER JOIN friend_friends
    ON user_friends.friend = friend_friends.friend;

    RETURN COALESCE(v_count, 0);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_mutual_friends_count(UUID, UUID) TO authenticated;

-- =====================================================
-- Realtime Publication
-- =====================================================

-- Enable realtime for friendships
ALTER PUBLICATION supabase_realtime ADD TABLE friendships;

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON TABLE friendships IS 'Stores friendship connections between users';
COMMENT ON COLUMN friendships.user_id IS 'User who initiated the friend request';
COMMENT ON COLUMN friendships.friend_id IS 'User who received the friend request';
COMMENT ON COLUMN friendships.status IS 'Status of friendship: pending, accepted, rejected, or blocked';
COMMENT ON FUNCTION get_mutual_friends_count IS 'Returns the count of mutual friends between two users';