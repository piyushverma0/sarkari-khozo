-- Table 1: User notification preferences
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT true,
    max_daily_notifications INTEGER DEFAULT 7,
    quiet_hours_start TIME DEFAULT '22:00',
    quiet_hours_end TIME DEFAULT '08:00',
    priority_threshold TEXT DEFAULT 'MEDIUM',
    categories JSONB DEFAULT '{"exams": true, "schemes": true, "policies": true}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Table 2: Notification queue
CREATE TABLE IF NOT EXISTS notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    news_id UUID NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    priority TEXT NOT NULL,
    relevance_score FLOAT NOT NULL,
    category TEXT NOT NULL,
    deep_link TEXT,
    scheduled_for TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'pending'
);

-- Table 3: Notification history
CREATE TABLE IF NOT EXISTS notification_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    news_id UUID NOT NULL,
    title TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    opened BOOLEAN DEFAULT false,
    opened_at TIMESTAMPTZ,
    action_taken TEXT,
    UNIQUE(user_id, news_id)
);

-- Table 4: Daily notification counter
CREATE TABLE IF NOT EXISTS user_daily_notification_count (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    count INTEGER DEFAULT 0,
    UNIQUE(user_id, date)
);

-- Table 5: User FCM tokens
CREATE TABLE IF NOT EXISTS user_fcm_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    fcm_token TEXT NOT NULL,
    device_info JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, fcm_token)
);

-- Table 6: Notification analytics
CREATE TABLE IF NOT EXISTS notification_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE DEFAULT CURRENT_DATE,
    total_queued INTEGER DEFAULT 0,
    total_sent INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    total_opened INTEGER DEFAULT 0,
    avg_relevance_score FLOAT,
    UNIQUE(date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_queue_user_status ON notification_queue(user_id, status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled ON notification_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notification_history_user ON notification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_fcm_tokens_user ON user_fcm_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_count_user_date ON user_daily_notification_count(user_id, date);

-- Enable Row Level Security
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_daily_notification_count ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_fcm_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_notification_preferences
CREATE POLICY "Users can view own preferences"
    ON user_notification_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
    ON user_notification_preferences FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
    ON user_notification_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for notification_history
CREATE POLICY "Users can view own history"
    ON notification_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own history"
    ON notification_history FOR UPDATE
    USING (auth.uid() = user_id);

-- RLS Policies for user_fcm_tokens
CREATE POLICY "Users can manage own tokens"
    ON user_fcm_tokens FOR ALL
    USING (auth.uid() = user_id);

-- RLS Policies for user_daily_notification_count
CREATE POLICY "Users can view own count"
    ON user_daily_notification_count FOR SELECT
    USING (auth.uid() = user_id);

-- Function 1: Auto-update updated_at timestamp (reuse if exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_notification_preferences
DROP TRIGGER IF EXISTS update_user_notification_preferences_updated_at ON user_notification_preferences;
CREATE TRIGGER update_user_notification_preferences_updated_at
    BEFORE UPDATE ON user_notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for user_fcm_tokens
DROP TRIGGER IF EXISTS update_user_fcm_tokens_updated_at ON user_fcm_tokens;
CREATE TRIGGER update_user_fcm_tokens_updated_at
    BEFORE UPDATE ON user_fcm_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function 2: Initialize default preferences for new users
CREATE OR REPLACE FUNCTION initialize_user_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_notification_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create preferences when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created_notification_prefs ON auth.users;
CREATE TRIGGER on_auth_user_created_notification_prefs
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION initialize_user_notification_preferences();

-- Function 3: Increment daily notification count
CREATE OR REPLACE FUNCTION increment_daily_notification_count(p_user_id UUID)
RETURNS void AS $$
BEGIN
    INSERT INTO user_daily_notification_count (user_id, date, count)
    VALUES (p_user_id, CURRENT_DATE, 1)
    ON CONFLICT (user_id, date)
    DO UPDATE SET count = user_daily_notification_count.count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function 4: Reset daily counts
CREATE OR REPLACE FUNCTION reset_daily_notification_counts()
RETURNS void AS $$
BEGIN
    DELETE FROM user_daily_notification_count
    WHERE date < CURRENT_DATE - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function 5: Get user's today notification count
CREATE OR REPLACE FUNCTION get_user_daily_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COALESCE(count, 0) INTO v_count
    FROM user_daily_notification_count
    WHERE user_id = p_user_id AND date = CURRENT_DATE;
    
    RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;