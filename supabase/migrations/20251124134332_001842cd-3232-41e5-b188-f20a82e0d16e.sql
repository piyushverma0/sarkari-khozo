-- =====================================================
-- Fix Security Issues in Friendships Trigger Functions
-- Add search_path to trigger functions for security
-- =====================================================

-- Fix update_friendships_updated_at function
CREATE OR REPLACE FUNCTION update_friendships_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Fix check_duplicate_friendship function
CREATE OR REPLACE FUNCTION check_duplicate_friendship()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
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
$$;