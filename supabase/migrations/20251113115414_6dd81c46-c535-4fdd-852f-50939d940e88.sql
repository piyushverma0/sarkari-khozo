-- Fix security warning: Set search_path for update_user_profile_timestamp function
CREATE OR REPLACE FUNCTION update_user_profile_timestamp()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.last_active_at = NOW();
    RETURN NEW;
END;
$$;