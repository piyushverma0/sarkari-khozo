-- Function 1: Check if user has premium access
CREATE OR REPLACE FUNCTION public.has_premium_access(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_subscriptions
        WHERE user_id = user_uuid
        AND subscription_status = 'premium'
        AND subscription_end_date > NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function 2: Check feature usage count
CREATE OR REPLACE FUNCTION public.get_feature_usage(
    user_uuid UUID,
    feature_name TEXT
)
RETURNS INT AS $$
DECLARE
    usage_count INT;
BEGIN
    EXECUTE format('SELECT %I FROM public.user_feature_usage WHERE user_id = $1', feature_name || '_count')
    INTO usage_count
    USING user_uuid;
    
    RETURN COALESCE(usage_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function 3: Increment feature usage
CREATE OR REPLACE FUNCTION public.increment_feature_usage(
    user_uuid UUID,
    feature_name TEXT
)
RETURNS VOID AS $$
BEGIN
    -- Insert or update
    INSERT INTO public.user_feature_usage (user_id)
    VALUES (user_uuid)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Increment count
    EXECUTE format(
        'UPDATE public.user_feature_usage SET %I = %I + 1, updated_at = NOW() WHERE user_id = $1',
        feature_name || '_count',
        feature_name || '_count'
    ) USING user_uuid;
    
    -- Set first used date if null
    EXECUTE format(
        'UPDATE public.user_feature_usage SET %I = NOW() WHERE user_id = $1 AND %I IS NULL',
        feature_name || '_first_used_at',
        feature_name || '_first_used_at'
    ) USING user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;