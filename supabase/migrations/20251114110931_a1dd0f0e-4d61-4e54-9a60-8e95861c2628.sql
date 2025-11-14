-- Fix notification schema: remove duplicate 'type' column
-- The table should only have 'notification_type', not both 'type' and 'notification_type'

-- Drop the redundant 'type' column
ALTER TABLE application_notifications
DROP COLUMN IF EXISTS type;

-- Ensure notification_type has proper constraint
ALTER TABLE application_notifications
ALTER COLUMN notification_type SET NOT NULL;

-- Add comment for clarity
COMMENT ON COLUMN application_notifications.notification_type IS
'Type of notification: NEW_APPLICATION, DEADLINE_REMINDER, STATUS_UPDATE, ADMIT_CARD_RELEASED, RESULT_RELEASED, etc.';