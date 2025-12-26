-- Migration: Fix deadline notification system
-- This migration fixes the deadline reminder notification system which was not working

-- ============================================================
-- DROP OLD FUNCTION
-- ============================================================
DROP FUNCTION IF EXISTS notify_approaching_deadlines();

-- ============================================================
-- CREATE CORRECTED FUNCTION
-- ============================================================
-- Function to notify about approaching deadlines
-- Checks the important_dates.application_end field (not deadline_reminders)
-- Creates notifications for 7, 3, and 1 days before deadline

CREATE OR REPLACE FUNCTION notify_approaching_deadlines()
RETURNS void AS $$
BEGIN
  -- Create deadline reminder notifications for applications tracked by users
  -- Checks important_dates->>'application_end' for the actual deadline date
  INSERT INTO application_notifications (
    user_id,
    application_id,
    title,
    message,
    notification_type,
    notification_channel,
    priority,
    scheduled_for,
    delivery_status,
    metadata
  )
  SELECT DISTINCT
    a.user_id,
    a.id as application_id,
    '⏰ Deadline Alert!',
    CASE
      WHEN days_until = 7 THEN a.title || ' deadline is in 7 days!'
      WHEN days_until = 3 THEN a.title || ' deadline is in 3 days!'
      WHEN days_until = 1 THEN a.title || ' deadline is TOMORROW!'
      ELSE a.title || ' deadline is approaching'
    END,
    'DEADLINE_REMINDER',
    'URGENT',
    'HIGH',
    NOW(),
    'PENDING',
    jsonb_build_object(
      'days_until_deadline', days_until,
      'deadline_date', (a.important_dates->>'application_end')::date
    )
  FROM applications a
  CROSS JOIN LATERAL (
    SELECT (
      (a.important_dates->>'application_end')::date - CURRENT_DATE
    ) AS days_until
  ) calc
  WHERE
    -- Check that important_dates exists and has application_end
    a.important_dates IS NOT NULL
    AND a.important_dates->>'application_end' IS NOT NULL
    AND (a.important_dates->>'application_end')::date > CURRENT_DATE
    -- Check if we should send a reminder today (7, 3, or 1 days before)
    AND days_until IN (7, 3, 1)
    -- Avoid duplicate notifications (check if we already sent one today)
    AND NOT EXISTS (
      SELECT 1 FROM application_notifications n
      WHERE n.user_id = a.user_id
        AND n.application_id = a.id
        AND n.notification_type = 'DEADLINE_REMINDER'
        AND n.created_at::date = CURRENT_DATE
        AND (n.metadata->>'days_until_deadline')::int = days_until
    );

  -- Log how many notifications were created
  RAISE NOTICE 'Created deadline reminder notifications';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================
-- Grant execute to service role for cron jobs
GRANT EXECUTE ON FUNCTION notify_approaching_deadlines() TO service_role;
GRANT EXECUTE ON FUNCTION notify_approaching_deadlines() TO authenticated;