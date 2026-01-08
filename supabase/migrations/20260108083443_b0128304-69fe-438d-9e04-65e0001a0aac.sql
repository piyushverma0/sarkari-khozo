-- =====================================================
-- Collaboration Notifications System
-- Stores notifications for collaboration events
-- =====================================================

-- Table: collaboration_notifications
-- Stores notifications for when users join notes via invite
CREATE TABLE IF NOT EXISTS collaboration_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    note_id UUID NOT NULL REFERENCES study_notes(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('COLLABORATOR_JOINED', 'COLLABORATOR_LEFT', 'NOTE_SHARED', 'PERMISSION_CHANGED')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    joiner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    joiner_name TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_collaboration_notifications_user_id ON collaboration_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_notifications_note_id ON collaboration_notifications(note_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_notifications_is_read ON collaboration_notifications(is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_collaboration_notifications_created_at ON collaboration_notifications(created_at DESC);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS
ALTER TABLE collaboration_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON collaboration_notifications FOR SELECT
USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON collaboration_notifications FOR UPDATE
USING (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON collaboration_notifications FOR DELETE
USING (user_id = auth.uid());

-- System can insert notifications
CREATE POLICY "System can insert notifications"
ON collaboration_notifications FOR INSERT
WITH CHECK (true);

-- =====================================================
-- Realtime Publication
-- =====================================================

-- Enable realtime for collaboration notifications
ALTER PUBLICATION supabase_realtime ADD TABLE collaboration_notifications;

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE collaboration_notifications
    SET is_read = TRUE, read_at = NOW()
    WHERE id = notification_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS void AS $$
BEGIN
    UPDATE collaboration_notifications
    SET is_read = TRUE, read_at = NOW()
    WHERE user_id = auth.uid() AND is_read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS INTEGER AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM collaboration_notifications WHERE user_id = auth.uid() AND is_read = FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON TABLE collaboration_notifications IS 'Stores notifications for collaboration events like users joining notes';
COMMENT ON COLUMN collaboration_notifications.notification_type IS 'Type of notification: COLLABORATOR_JOINED, COLLABORATOR_LEFT, NOTE_SHARED, PERMISSION_CHANGED';
COMMENT ON COLUMN collaboration_notifications.joiner_id IS 'User ID of the person who joined (for COLLABORATOR_JOINED notifications)';
COMMENT ON COLUMN collaboration_notifications.joiner_name IS 'Name of the person who joined (cached for performance)';