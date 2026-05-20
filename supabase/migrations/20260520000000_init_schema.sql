-- Create enum for roles
CREATE TYPE user_role AS ENUM ('maham', 'mammash', 'rohav');

-- Create users table
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  personal_id TEXT UNIQUE NOT NULL,
  role user_role NOT NULL
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policies for users
CREATE POLICY "Users can view all users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Maham can insert users" ON public.users FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'maham')
);
CREATE POLICY "Maham can update users" ON public.users FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'maham')
);
CREATE POLICY "Maham can delete users" ON public.users FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'maham')
);

-- Create cadets table
CREATE TABLE public.cadets (
  cadet_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  personal_id TEXT UNIQUE NOT NULL,
  team_number INTEGER CHECK (team_number BETWEEN 1 AND 8),
  phone_number TEXT,
  birth_date DATE,
  specific_role TEXT
);

-- Enable RLS
ALTER TABLE public.cadets ENABLE ROW LEVEL SECURITY;

-- Policies for cadets
CREATE POLICY "Everyone can view cadets" ON public.cadets FOR SELECT USING (true);
CREATE POLICY "Maham can insert cadets" ON public.cadets FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'maham')
);
CREATE POLICY "Maham can update cadets" ON public.cadets FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'maham')
);
CREATE POLICY "Maham can delete cadets" ON public.cadets FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'maham')
);

-- Create attendance_logs table
CREATE TABLE public.attendance_logs (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL,
  cadet_id UUID NOT NULL REFERENCES public.cadets(cadet_id) ON DELETE CASCADE,
  status BOOLEAN NOT NULL,
  absence_reason TEXT,
  notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE (event_id, cadet_id)
);

-- Enable RLS
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

-- Policies for attendance_logs
CREATE POLICY "Everyone can view attendance" ON public.attendance_logs FOR SELECT USING (true);
CREATE POLICY "Maham can manage attendance" ON public.attendance_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'maham')
);
CREATE POLICY "Mammash can manage own team attendance" ON public.attendance_logs FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    JOIN public.cadets c_mammash ON u.personal_id = c_mammash.personal_id
    JOIN public.cadets c_cadet ON c_mammash.team_number = c_cadet.team_number 
    WHERE u.id = auth.uid() AND u.role = 'mammash' AND c_cadet.cadet_id = attendance_logs.cadet_id
  )
);

-- Function to automatically update 'updated_at'
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for attendance_logs
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.attendance_logs
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();
