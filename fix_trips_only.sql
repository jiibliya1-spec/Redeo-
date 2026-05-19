-- ═══════════════════════════════════════════════
-- Fix: Create ONLY trips table (without trigger conflict)
-- ═══════════════════════════════════════════════

-- 1. Create trips table ONLY
CREATE TABLE IF NOT EXISTS public.trips (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id uuid NOT NULL,
  from_location text NOT NULL,
  to_location text NOT NULL,
  departure_date date NOT NULL,
  departure_time text NOT NULL,
  arrival_time text,
  price numeric NOT NULL DEFAULT 0,
  available_seats integer NOT NULL DEFAULT 1,
  total_seats integer NOT NULL DEFAULT 4,
  distance text,
  duration text,
  status text DEFAULT 'upcoming',
  route jsonb DEFAULT '[]'::jsonb,
  amenities jsonb DEFAULT '["Air Conditioning"]'::jsonb,
  vehicle_info jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "trips_select_all" ON public.trips
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "trips_insert_own" ON public.trips
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "trips_update_own" ON public.trips
  FOR UPDATE TO authenticated USING (auth.uid() = driver_id);

CREATE POLICY "trips_delete_own" ON public.trips
  FOR DELETE TO authenticated USING (auth.uid() = driver_id);

-- 4. Verify
SELECT 'trips table created successfully!' as result;
