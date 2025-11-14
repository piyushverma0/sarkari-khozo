
-- Trigger 1: New Application Posted
-- Create function to notify users of new applications
CREATE OR REPLACE FUNCTION notify_new_application()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notifications for users tracking this category/state
  INSERT INTO application_notifications (
    user_id,
    application_id,
    title,
    message,
    type,
    notification_channel,
    priority,
    scheduled_for,
    delivery_status,
    notification_type
  )
  SELECT
    up.user_id,
    NEW.id,
    'New Job Alert! 🎯',
    'New ' || NEW.title || ' application posted' || 
    CASE 
      WHEN NEW.state_specific IS NOT NULL THEN ' in ' || NEW.state_specific 
      ELSE '' 
    END,
    'NEW_APPLICATION',
    'GENERAL',
    'MEDIUM',
    NOW(),
    'PENDING',
    'NEW_APPLICATION'
  FROM user_profiles up
  JOIN user_notification_preferences unp ON unp.user_id = up.user_id
  WHERE unp.enabled = true
    AND (unp.categories->>'schemes' = 'true' OR unp.categories->>'exams' = 'true')
    AND (up.selected_region = NEW.state_specific OR up.selected_region IS NULL OR NEW.state_specific IS NULL);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new applications
DROP TRIGGER IF EXISTS on_application_created ON applications;
CREATE TRIGGER on_application_created
  AFTER INSERT ON applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_application();

-- Trigger 2: Deadline Approaching (3 days)
-- Create function to notify about approaching deadlines
CREATE OR REPLACE FUNCTION notify_approaching_deadlines()
RETURNS void AS $$
DECLARE
  deadline_date DATE;
  app_record RECORD;
BEGIN
  -- Loop through applications with deadlines in 3 days
  FOR app_record IN 
    SELECT 
      a.id,
      a.user_id,
      a.title,
      a.important_dates->>'application_deadline' as deadline
    FROM applications a
    WHERE a.important_dates->>'application_deadline' IS NOT NULL
  LOOP
    -- Parse the deadline date
    BEGIN
      deadline_date := (app_record.deadline)::DATE;
      
      -- Check if deadline is in 3 days
      IF deadline_date - CURRENT_DATE = 3 THEN
        -- Create notification for the user who saved this application
        INSERT INTO application_notifications (
          user_id,
          application_id,
          title,
          message,
          type,
          notification_channel,
          priority,
          scheduled_for,
          delivery_status,
          notification_type
        )
        VALUES (
          app_record.user_id,
          app_record.id,
          '⏰ Deadline Alert!',
          app_record.title || ' application ends in 3 days. Apply now!',
          'DEADLINE_REMINDER',
          'URGENT',
          'HIGH',
          NOW(),
          'PENDING',
          'DEADLINE_REMINDER'
        )
        ON CONFLICT DO NOTHING;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        -- Skip if date parsing fails
        CONTINUE;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Schedule deadline reminders to run daily at 9 AM
SELECT cron.schedule(
  'deadline-reminders',
  '0 9 * * *',
  'SELECT notify_approaching_deadlines();'
);
