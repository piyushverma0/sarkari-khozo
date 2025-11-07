-- Fix update_updated_at_column function to set search_path
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add RLS policies for notification_queue
CREATE POLICY "Service role can manage notification queue"
    ON notification_queue FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

-- Add RLS policies for notification_analytics  
CREATE POLICY "Anyone can view analytics"
    ON notification_analytics FOR SELECT
    USING (true);