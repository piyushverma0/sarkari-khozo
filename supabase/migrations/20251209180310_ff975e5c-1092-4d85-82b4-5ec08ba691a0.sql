-- Create purchase_history table
CREATE TABLE public.purchase_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    
    -- Purchase details
    product_id TEXT NOT NULL,
    purchase_token TEXT NOT NULL,
    order_id TEXT,
    purchase_state TEXT,
        -- Values: 'pending', 'purchased', 'cancelled', 'refunded'
    
    -- Verification
    verified BOOLEAN DEFAULT false,
    acknowledged BOOLEAN DEFAULT false,
    
    -- Amount
    price_amount_micros BIGINT,
    price_currency_code TEXT,
    
    -- Timestamps
    purchase_time TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_purchase_history_user_id ON public.purchase_history(user_id);
CREATE INDEX idx_purchase_history_token ON public.purchase_history(purchase_token);
CREATE UNIQUE INDEX idx_purchase_token_unique ON public.purchase_history(purchase_token);

-- Enable Row Level Security
ALTER TABLE public.purchase_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own purchases"
ON public.purchase_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own purchases"
ON public.purchase_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);