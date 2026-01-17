-- Enable RLS
ALTER TABLE user_gk_responses ENABLE ROW LEVEL SECURITY;

-- Remove old policies
DROP POLICY IF EXISTS "Users can insert their own GK responses" ON user_gk_responses;
DROP POLICY IF EXISTS "Users can read their own GK responses" ON user_gk_responses;
DROP POLICY IF EXISTS "Users can update their own GK responses" ON user_gk_responses;

-- Create new policies (user_id is UUID type)
CREATE POLICY "Users can insert their own GK responses"
ON user_gk_responses FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own GK responses"
ON user_gk_responses FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own GK responses"
ON user_gk_responses FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add unique constraint (prevents duplicate answers)
ALTER TABLE user_gk_responses
DROP CONSTRAINT IF EXISTS unique_user_mcq_response;

ALTER TABLE user_gk_responses
ADD CONSTRAINT unique_user_mcq_response
UNIQUE (user_id, mcq_date, question_index);

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_user_gk_responses_user_date
ON user_gk_responses(user_id, mcq_date);