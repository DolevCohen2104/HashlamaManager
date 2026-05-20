-- 1. Ensure helper function exists
CREATE OR REPLACE FUNCTION public.auth_personal_id() RETURNS text AS $$
  SELECT split_part(auth.jwt()->>'email', '@', 1);
$$ LANGUAGE sql STABLE;

-- 2. Force RLS enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cadets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

-- 3. Drop ALL possible policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view all users" ON public.users;
DROP POLICY IF EXISTS "Maham can insert users" ON public.users;
DROP POLICY IF EXISTS "Maham can update users" ON public.users;
DROP POLICY IF EXISTS "Maham can delete users" ON public.users;

DROP POLICY IF EXISTS "Everyone can view cadets" ON public.cadets;
DROP POLICY IF EXISTS "Maham can insert cadets" ON public.cadets;
DROP POLICY IF EXISTS "Maham can update cadets" ON public.cadets;
DROP POLICY IF EXISTS "Maham can delete cadets" ON public.cadets;

DROP POLICY IF EXISTS "Everyone can view attendance" ON public.attendance_logs;
DROP POLICY IF EXISTS "Maham can manage attendance" ON public.attendance_logs;
DROP POLICY IF EXISTS "Mammash can manage own team attendance" ON public.attendance_logs;

-- 4. Recreate Users policies
CREATE POLICY "Users can view all users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Maham can insert users" ON public.users FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE personal_id = public.auth_personal_id() AND role = 'maham')
);
CREATE POLICY "Maham can update users" ON public.users FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.users WHERE personal_id = public.auth_personal_id() AND role = 'maham')
);
CREATE POLICY "Maham can delete users" ON public.users FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.users WHERE personal_id = public.auth_personal_id() AND role = 'maham')
);

-- 5. Recreate Cadets policies
CREATE POLICY "Everyone can view cadets" ON public.cadets FOR SELECT USING (true);
CREATE POLICY "Maham can insert cadets" ON public.cadets FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE personal_id = public.auth_personal_id() AND role = 'maham')
);
CREATE POLICY "Maham can update cadets" ON public.cadets FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.users WHERE personal_id = public.auth_personal_id() AND role = 'maham')
);
CREATE POLICY "Maham can delete cadets" ON public.cadets FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.users WHERE personal_id = public.auth_personal_id() AND role = 'maham')
);

-- 6. Recreate Attendance policies
CREATE POLICY "Everyone can view attendance" ON public.attendance_logs FOR SELECT USING (true);
CREATE POLICY "Maham can manage attendance" ON public.attendance_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE personal_id = public.auth_personal_id() AND role = 'maham')
);

CREATE POLICY "Mammash can manage own team attendance" ON public.attendance_logs FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    JOIN public.cadets c_mammash ON u.personal_id = c_mammash.personal_id
    JOIN public.cadets c_cadet ON c_mammash.team_number = c_cadet.team_number 
    WHERE u.personal_id = public.auth_personal_id() AND u.role = 'mammash' AND c_cadet.cadet_id = attendance_logs.cadet_id
  )
);
