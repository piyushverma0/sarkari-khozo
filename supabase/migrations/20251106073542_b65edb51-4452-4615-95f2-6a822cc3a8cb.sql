-- Fix security warnings for notification functions

-- Fix set_notification_read_at function - set search_path
CREATE OR REPLACE FUNCTION set_notification_read_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.is_read = TRUE AND OLD.is_read = FALSE THEN
        NEW.read_at = NOW();
    END IF;
    RETURN NEW;
END;
$$;

-- Fix get_notification_stats function - set search_path
CREATE OR REPLACE FUNCTION get_notification_stats(p_user_id UUID)
RETURNS JSON 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total', COUNT(*),
        'unread', COUNT(*) FILTER (WHERE is_read = FALSE),
        'urgent', COUNT(*) FILTER (WHERE notification_channel = 'URGENT' AND is_read = FALSE),
        'by_type', (
            SELECT json_object_agg(type, count)
            FROM (
                SELECT type, COUNT(*) as count
                FROM application_notifications
                WHERE user_id = p_user_id AND is_read = FALSE
                GROUP BY type
            ) type_counts
        )
    ) INTO result
    FROM application_notifications
    WHERE user_id = p_user_id;
    RETURN result;
END;
$$;