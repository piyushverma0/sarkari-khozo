-- Create user_subscriptions table
CREATE TABLE public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    
    -- Subscription status
    subscription_status TEXT NOT NULL DEFAULT 'free', 
        -- Values: 'free', 'premium', 'expired', 'cancelled'
    
    plan_type TEXT DEFAULT 'free',
        -- Values: 'free', 'premium_monthly'
    
    -- Purchase info
    product_id TEXT,
        -- 'com.sarkarikhozo.premium.monthly.inr' or '.usd'
    purchase_token TEXT,
    order_id TEXT,
    
    -- Dates
    subscription_start_date TIMESTAMPTZ,
    subscription_end_date TIMESTAMPTZ,
    last_verified_at TIMESTAMPTZ,
    
    -- Auto-renewal
    auto_renewing BOOLEAN DEFAULT true,
    
    -- Region
    pricing_region TEXT DEFAULT 'IN',
        -- Values: 'IN' (India), 'OTHER'
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for quick lookups
CREATE INDEX idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON public.user_subscriptions(subscription_status);

-- Enable Row Level Security
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own subscription"
ON public.user_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription"
ON public.user_subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
ON public.user_subscriptions
FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_subscriptions_updated_at
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();