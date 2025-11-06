-- ============================================================
-- SARKARI KHOZO - ENHANCED NOTIFICATION SYSTEM (Final)
-- ============================================================

-- Step 1: Add new columns
ALTER TABLE application_notifications 
ADD COLUMN IF NOT EXISTS type TEXT,
ADD COLUMN IF NOT EXISTS notification_channel TEXT DEFAULT 'GENERAL',
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'MEDIUM',
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Step 2: Migrate notification_type to type with proper casing
UPDATE application_notifications 
SET type = CASE 
    WHEN notification_type = 'deadline_reminder' THEN 'DEADLINE_REMINDER'
    WHEN notification_type = 'status_update' THEN 'STATUS_UPDATE'
    WHEN notification_type = 'new_opportunity' THEN 'NEW_OPPORTUNITY'
    ELSE 'GENERAL'
END
WHERE type IS NULL;

-- Step 3: Migrate delivery_status to match new values
UPDATE application_notifications 
SET delivery_status = CASE 
    WHEN delivery_status = 'pending' THEN 'PENDING'
    WHEN delivery_status = 'delivered' THEN 'DELIVERED'
    WHEN delivery_status = 'failed' THEN 'FAILED'
    WHEN delivery_status = 'dismissed' THEN 'DELIVERED'
    ELSE 'PENDING'
END;

-- Step 4: Mark dismissed notifications as read
UPDATE application_notifications 
SET is_read = TRUE, read_at = NOW()
WHERE delivery_status = 'DELIVERED' AND is_read = FALSE;

-- Step 5: Add CHECK constraints
ALTER TABLE application_notifications 
DROP CONSTRAINT IF EXISTS check_notification_type;
ALTER TABLE application_notifications 
ADD CONSTRAINT check_notification_type 
CHECK (type IN ('DEADLINE_REMINDER', 'STATUS_UPDATE', 'NEW_OPPORTUNITY', 'GENERAL'));

ALTER TABLE application_notifications 
DROP CONSTRAINT IF EXISTS check_notification_channel;
ALTER TABLE application_notifications 
ADD CONSTRAINT check_notification_channel 
CHECK (notification_channel IN ('URGENT', 'GENERAL', 'UPDATES'));

ALTER TABLE application_notifications 
DROP CONSTRAINT IF EXISTS check_priority;
ALTER TABLE application_notifications 
ADD CONSTRAINT check_priority 
CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT'));

ALTER TABLE application_notifications 
DROP CONSTRAINT IF EXISTS check_delivery_status;
ALTER TABLE application_notifications 
ADD CONSTRAINT check_delivery_status 
CHECK (delivery_status IN ('PENDING', 'DELIVERED', 'FAILED', 'CANCELLED'));

-- Step 6: Make type NOT NULL
ALTER TABLE application_notifications 
ALTER COLUMN type SET NOT NULL;

-- Step 7: Create performance indexes
CREATE INDEX IF NOT EXISTS idx_notifications_type ON application_notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_channel ON application_notifications(notification_channel);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON application_notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON application_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_pending ON application_notifications(scheduled_for) WHERE delivery_status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON application_notifications(user_id, is_read) WHERE is_read = FALSE;

-- Step 8: Create read_at trigger
CREATE OR REPLACE FUNCTION set_notification_read_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_read = TRUE AND OLD.is_read = FALSE THEN
        NEW.read_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_read_at ON application_notifications;
CREATE TRIGGER trigger_set_read_at
    BEFORE UPDATE ON application_notifications
    FOR EACH ROW
    EXECUTE FUNCTION set_notification_read_at();

-- Step 9: Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    urgent_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    general_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updates_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    deadline_reminders BOOLEAN NOT NULL DEFAULT TRUE,
    status_updates BOOLEAN NOT NULL DEFAULT TRUE,
    new_opportunities BOOLEAN NOT NULL DEFAULT FALSE,
    reminder_days INTEGER[] DEFAULT ARRAY[7, 3, 1],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, application_id)
);

CREATE INDEX IF NOT EXISTS idx_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_preferences_application_id ON notification_preferences(application_id);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification preferences"
    ON notification_preferences FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notification preferences"
    ON notification_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
    ON notification_preferences FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification preferences"
    ON notification_preferences FOR DELETE USING (auth.uid() = user_id);

-- Step 10: Create stats function
CREATE OR REPLACE FUNCTION get_notification_stats(p_user_id UUID)
RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_notification_stats(UUID) TO authenticated;