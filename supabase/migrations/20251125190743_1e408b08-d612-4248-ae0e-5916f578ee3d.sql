-- Migration: Fix search_path for notification functions
-- Addresses security linter warnings for SECURITY DEFINER functions

-- Drop and recreate notify_new_application with proper search_path
DROP FUNCTION IF EXISTS notify_new_application();

CREATE OR REPLACE FUNCTION notify_new_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create notifications for users tracking this state/category
  -- Only create notifications if users exist who might be interested
  INSERT INTO application_notifications (
    user_id,
    application_id,
    title,
    message,
    notification_type,
    notification_channel,
    priority,
    scheduled_for,
    delivery_status
  )
  SELECT
    auth.uid(),  -- Current authenticated user
    NEW.id,
    'New Opportunity! 🎯',
    'New application: ' || NEW.title,
    'NEW_OPPORTUNITY',
    'GENERAL',
    'MEDIUM',
    NOW(),
    'PENDING'
  WHERE auth.uid() IS NOT NULL;  -- Only if there's an authenticated user

  RETURN NEW;
END;
$$;

-- Drop and recreate notify_approaching_deadlines with proper search_path
DROP FUNCTION IF EXISTS notify_approaching_deadlines();

CREATE OR REPLACE FUNCTION notify_approaching_deadlines()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create deadline reminder notifications
  INSERT INTO application_notifications (
    user_id,
    application_id,
    title,
    message,
    notification_type,
    notification_channel,
    priority,
    scheduled_for,
    delivery_status
  )
  SELECT
    t.user_id,
    t.application_id,
    '⏰ Deadline Alert!',
    a.title || ' deadline is approaching',
    'DEADLINE_REMINDER',
    'URGENT',
    'HIGH',
    NOW(),
    'PENDING'
  FROM tracked_applications t
  INNER JOIN applications a ON t.application_id = a.id
  WHERE a.deadline_reminders IS NOT NULL
    AND a.deadline_reminders::date - CURRENT_DATE IN (7, 3, 1)
    -- Avoid duplicate notifications
    AND NOT EXISTS (
      SELECT 1 FROM application_notifications n
      WHERE n.user_id = t.user_id
        AND n.application_id = t.application_id
        AND n.notification_type = 'DEADLINE_REMINDER'
        AND n.created_at > CURRENT_DATE
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION notify_new_application() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_approaching_deadlines() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_approaching_deadlines() TO service_role;