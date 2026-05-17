-- WansniAuto - جداول Supabase الأساسية
-- انسخ كامل كاين هنا ودير Paste ف Supabase → SQL Editor → Run

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL, email text NOT NULL, phone text,
  role text DEFAULT 'passenger',
  bio text, avatar text,
  is_verified boolean DEFAULT false,
  rating numeric DEFAULT 5.0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "p1" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "p2" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "p3" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 2. VERIFICATIONS
CREATE TABLE IF NOT EXISTS public.verifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type text NOT NULL,
  status text DEFAULT 'pending',
  url text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, doc_type)
);
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "v1" ON public.verifications FOR ALL TO authenticated USING (auth.uid() = user_id);

-- 3. TRIPS
CREATE TABLE IF NOT EXISTS public.trips (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_location text NOT NULL, to_location text NOT NULL,
  departure_date date NOT NULL, departure_time text NOT NULL,
  price numeric NOT NULL,
  available_seats integer DEFAULT 1, total_seats integer DEFAULT 4,
  status text DEFAULT 'upcoming',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "t1" ON public.trips FOR SELECT TO authenticated USING (true);
CREATE POLICY "t2" ON public.trips FOR INSERT TO authenticated WITH CHECK (auth.uid() = driver_id);

-- 4. MESSAGES
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid NOT NULL, receiver_id uuid NOT NULL,
  content text NOT NULL, read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "m1" ON public.messages FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "m2" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);

-- 5. BOOKINGS
CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id uuid NOT NULL, passenger_id uuid NOT NULL, driver_id uuid NOT NULL,
  seats integer DEFAULT 1, total_price numeric NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "b1" ON public.bookings FOR SELECT TO authenticated USING (auth.uid() = passenger_id OR auth.uid() = driver_id);
CREATE POLICY "b2" ON public.bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = passenger_id);

-- 6. REALTIME
ALTER TABLE public.messages REPLICA IDENTITY FULL;
BEGIN; DROP PUBLICATION IF EXISTS supabase_realtime; CREATE PUBLICATION supabase_realtime; ALTER PUBLICATION supabase_realtime ADD TABLE public.messages; COMMIT;

-- 7. STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars','avatars',true),('verification-docs','verification-docs',false) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "s1" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('avatars','verification-docs'));
CREATE POLICY "s2" ON storage.objects FOR SELECT TO authenticated USING (bucket_id IN ('avatars','verification-docs'));
