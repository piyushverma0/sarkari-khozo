-- Migration: Fix notification triggers to use 'notification_type' instead of 'type'
-- This fixes the database trigger that was trying to insert with the old column name

-- ============================================================
-- DROP OLD TRIGGERS AND FUNCTIONS
-- ============================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_application_created ON applications;
DROP TRIGGER IF EXISTS on_application_updated ON applications;

-- Drop old functions
DROP FUNCTION IF EXISTS notify_new_application();
DROP FUNCTION IF EXISTS notify_approaching_deadlines();

-- ============================================================
-- CREATE NEW FUNCTIONS WITH CORRECT COLUMN NAME
-- ============================================================

-- Function to notify users of new applications
CREATE OR REPLACE FUNCTION notify_new_application()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notifications for users tracking this state/category
  -- Only create notifications if users exist who might be interested
  INSERT INTO application_notifications (
    user_id,
    application_id,
    title,
    message,
    notification_type,  -- FIXED: Changed from 'type' to 'notification_type'
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify about approaching deadlines (called by cron jobs)
CREATE OR REPLACE FUNCTION notify_approaching_deadlines()
RETURNS void AS $$
BEGIN
  -- Create deadline reminder notifications
  INSERT INTO application_notifications (
    user_id,
    application_id,
    title,
    message,
    notification_type,  -- FIXED: Changed from 'type' to 'notification_type'
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- CREATE TRIGGERS
-- ============================================================

-- Note: We're NOT creating the on_application_created trigger
-- because it would spam notifications every time an application is tracked.
-- Notifications should be created through the app logic or scheduled jobs instead.

-- The trigger is kept as a function in case you want to enable it later
-- To enable: CREATE TRIGGER on_application_created
--   AFTER INSERT ON applications
--   FOR EACH ROW
--   EXECUTE FUNCTION notify_new_application();

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION notify_new_application() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_approaching_deadlines() TO authenticated;

-- Grant execute to service role for cron jobs
GRANT EXECUTE ON FUNCTION notify_approaching_deadlines() TO service_role;

-- ============================================================
-- VERIFICATION
-- ============================================================

-- Verify functions were created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'notify_new_application'
  ) THEN
    RAISE EXCEPTION 'Function notify_new_application was not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'notify_approaching_deadlines'
  ) THEN
    RAISE EXCEPTION 'Function notify_approaching_deadlines was not created';
  END IF;

  RAISE NOTICE 'Migration 005 completed successfully!';
END $$;