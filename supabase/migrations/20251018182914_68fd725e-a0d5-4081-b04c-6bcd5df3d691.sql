-- Add startup-specific columns to applications table
ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS program_type TEXT,
ADD COLUMN IF NOT EXISTS funding_amount TEXT,
ADD COLUMN IF NOT EXISTS sector TEXT,
ADD COLUMN IF NOT EXISTS stage TEXT,
ADD COLUMN IF NOT EXISTS state_specific TEXT,
ADD COLUMN IF NOT EXISTS success_rate TEXT,
ADD COLUMN IF NOT EXISTS dpiit_required BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN public.applications.program_type IS 'Type of program: grant, seed_funding, incubation, accelerator, policy_benefit, tax_benefit';
COMMENT ON COLUMN public.applications.funding_amount IS 'Funding range like ₹20-50 lakh or ₹10 lakh';
COMMENT ON COLUMN public.applications.sector IS 'Target sector: Tech, AgriTech, HealthTech, FinTech, EdTech, All Sectors';
COMMENT ON COLUMN public.applications.stage IS 'Startup stage: Idea, Prototype, Revenue, Growth, All Stages';
COMMENT ON COLUMN public.applications.state_specific IS 'State name if program is state-specific';
COMMENT ON COLUMN public.applications.success_rate IS 'Success rate indicator: High, Medium, Low';
COMMENT ON COLUMN public.applications.dpiit_required IS 'Whether DPIIT recognition is required';