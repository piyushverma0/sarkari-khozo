-- Make application_id nullable for general notifications
-- Some notifications may not be tied to a specific application

ALTER TABLE application_notifications
ALTER COLUMN application_id DROP NOT NULL;

COMMENT ON COLUMN application_notifications.application_id IS
'Optional reference to an application. NULL for general system notifications.';