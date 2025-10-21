-- Create Indian states table
CREATE TABLE IF NOT EXISTS public.indian_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create Indian districts table
CREATE TABLE IF NOT EXISTS public.indian_districts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  state_id uuid NOT NULL REFERENCES public.indian_states(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(name, state_id)
);

-- Create Indian blocks table
CREATE TABLE IF NOT EXISTS public.indian_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  district_id uuid NOT NULL REFERENCES public.indian_districts(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(name, district_id)
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_indian_districts_state_id ON public.indian_districts(state_id);
CREATE INDEX IF NOT EXISTS idx_indian_blocks_district_id ON public.indian_blocks(district_id);
CREATE INDEX IF NOT EXISTS idx_indian_states_name ON public.indian_states(name);
CREATE INDEX IF NOT EXISTS idx_indian_districts_name ON public.indian_districts(name);
CREATE INDEX IF NOT EXISTS idx_indian_blocks_name ON public.indian_blocks(name);

-- Enable RLS (read-only for everyone)
ALTER TABLE public.indian_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indian_districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indian_blocks ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Anyone can view states" ON public.indian_states FOR SELECT USING (true);
CREATE POLICY "Anyone can view districts" ON public.indian_districts FOR SELECT USING (true);
CREATE POLICY "Anyone can view blocks" ON public.indian_blocks FOR SELECT USING (true);