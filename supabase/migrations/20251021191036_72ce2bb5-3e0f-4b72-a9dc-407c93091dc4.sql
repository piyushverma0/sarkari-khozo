-- Phase 1: Database Schema Updates for Application Tracking & Notifications

-- 1.1 Extend Applications Table
-- Add new columns to track application lifecycle
ALTER TABLE applications ADD COLUMN IF NOT EXISTS applied_confirmed boolean DEFAULT false;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS application_status text DEFAULT 'discovered';
ALTER TABLE applications ADD COLUMN IF NOT EXISTS last_checked_at timestamp with time zone DEFAULT now();
ALTER TABLE applications ADD COLUMN IF NOT EXISTS source_check_frequency text DEFAULT 'weekly';
ALTER TABLE applications ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{"enabled": true, "channels": ["push", "in_app"], "days_before": [7, 3, 1]}'::jsonb;

-- 1.2 Create Notifications Table
-- Store all notification events and delivery status
CREATE TABLE IF NOT EXISTS application_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  application_id uuid NOT NULL,
  notification_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  scheduled_for timestamp with time zone NOT NULL,
  delivered_at timestamp with time zone,
  delivery_status text DEFAULT 'pending',
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT fk_notification_application FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

-- Add comment for notification_type values
COMMENT ON COLUMN application_notifications.notification_type IS 'Values: deadline_reminder, status_change, new_date_added';

-- Add comment for delivery_status values
COMMENT ON COLUMN application_notifications.delivery_status IS 'Values: pending, delivered, failed, dismissed';

-- Indexes for performance
CREATE INDEX idx_notifications_user_id ON application_notifications(user_id);
CREATE INDEX idx_notifications_application_id ON application_notifications(application_id);
CREATE INDEX idx_notifications_scheduled ON application_notifications(scheduled_for) WHERE delivery_status = 'pending';

-- Enable RLS
ALTER TABLE application_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own notifications" ON application_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON application_notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications" ON application_notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 1.3 Create Application Status History Table
-- Track all status changes for audit trail
CREATE TABLE IF NOT EXISTS application_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL,
  previous_status text,
  new_status text NOT NULL,
  changed_by text DEFAULT 'system',
  change_reason text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT fk_status_history_application FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

-- Add comment for changed_by values
COMMENT ON COLUMN application_status_history.changed_by IS 'Values: system, user, scraper';

-- Add comment for status values
COMMENT ON COLUMN application_status_history.new_status IS 'Values: discovered, applied, correction_window, admit_card_released, exam_completed, result_pending, result_released, archived';

CREATE INDEX idx_status_history_application ON application_status_history(application_id);
CREATE INDEX idx_status_history_created ON application_status_history(created_at DESC);

-- Enable RLS
ALTER TABLE application_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view status history for their applications" ON application_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM applications 
      WHERE applications.id = application_status_history.application_id 
      AND applications.user_id = auth.uid()
    )
  );

-- Trigger to automatically update updated_at timestamp on notifications
CREATE OR REPLACE FUNCTION update_notification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_application_notifications_updated_at
  BEFORE UPDATE ON application_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_updated_at();