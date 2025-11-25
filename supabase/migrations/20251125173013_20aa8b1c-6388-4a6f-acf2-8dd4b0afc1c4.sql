-- ============================================================
-- SARKARI KHOZO - NOTIFICATION SYSTEM SCHEMA UPDATES
-- ============================================================
-- This migration ensures all notification system components
-- are properly configured (idempotent - safe to re-run)
-- ============================================================

-- Ensure all indexes exist
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON application_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_application_id ON application_notifications(application_id);
CREATE INDEX IF NOT EXISTS idx_notifications_notification_type ON application_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_channel ON application_notifications(notification_channel);
CREATE INDEX IF NOT EXISTS idx_notifications_delivery_status ON application_notifications(delivery_status);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON application_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_for ON application_notifications(scheduled_for) WHERE delivery_status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON application_notifications(created_at DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON application_notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON application_notifications(user_id, created_at DESC);

-- Indexes for notification_preferences
CREATE INDEX IF NOT EXISTS idx_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_preferences_application_id ON notification_preferences(application_id);

-- Ensure triggers exist for application_notifications
DROP TRIGGER IF EXISTS trigger_update_notification_timestamp ON application_notifications;
CREATE TRIGGER trigger_update_notification_timestamp
    BEFORE UPDATE ON application_notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_updated_at();

DROP TRIGGER IF EXISTS trigger_set_read_at ON application_notifications;
CREATE TRIGGER trigger_set_read_at
    BEFORE UPDATE ON application_notifications
    FOR EACH ROW
    EXECUTE FUNCTION set_notification_read_at();

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_notification_stats(UUID) TO authenticated;

-- Add documentation comments
COMMENT ON TABLE application_notifications IS 'Stores all user notifications including scheduled, delivered, and read status';
COMMENT ON TABLE notification_preferences IS 'Stores per-application notification preferences for each user';
COMMENT ON COLUMN application_notifications.notification_type IS 'Type of notification: DEADLINE_REMINDER, STATUS_UPDATE, NEW_OPPORTUNITY, or GENERAL';
COMMENT ON COLUMN application_notifications.notification_channel IS 'Notification channel: URGENT (critical deadlines), GENERAL (regular updates), UPDATES (status changes)';
COMMENT ON COLUMN application_notifications.delivery_status IS 'Delivery status: PENDING (scheduled), DELIVERED (sent), FAILED (delivery failed), CANCELLED (notification cancelled)';
COMMENT ON COLUMN application_notifications.priority IS 'Notification priority level: LOW, MEDIUM, HIGH, URGENT';
COMMENT ON COLUMN application_notifications.metadata IS 'Additional metadata as JSON (e.g., days_until_deadline, old_status, new_status)';