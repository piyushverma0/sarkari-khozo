-- This migration fixes the application_notifications table to allow
-- general notifications (like welcome messages) that aren't tied to
-- a specific application.

-- Drop the NOT NULL constraint on application_id
ALTER TABLE application_notifications
ALTER COLUMN application_id DROP NOT NULL;

-- Add comment explaining the nullable field
COMMENT ON COLUMN application_notifications.application_id IS
'References the application this notification is about. NULL for general notifications (welcome, announcements, etc.)';