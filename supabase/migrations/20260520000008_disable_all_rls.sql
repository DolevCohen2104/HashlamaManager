-- Drop all existing RLS policies that rely on auth.uid() (Supabase Auth removed)
-- and disable RLS on all tables so our custom personal_id auth can work.

-- attendance_logs
DROP POLICY IF EXISTS "Everyone can view attendance" ON public.attendance_logs;
DROP POLICY IF EXISTS "Maham can manage attendance" ON public.attendance_logs;
DROP POLICY IF EXISTS "Mammash can manage own team attendance" ON public.attendance_logs;
DROP POLICY IF EXISTS "Allow all attendance operations" ON public.attendance_logs;

ALTER TABLE public.attendance_logs DISABLE ROW LEVEL SECURITY;

-- cadets
DROP POLICY IF EXISTS "Everyone can view cadets" ON public.cadets;
DROP POLICY IF EXISTS "Maham can insert cadets" ON public.cadets;
DROP POLICY IF EXISTS "Maham can update cadets" ON public.cadets;
DROP POLICY IF EXISTS "Maham can delete cadets" ON public.cadets;
DROP POLICY IF EXISTS "Allow all cadet operations" ON public.cadets;

ALTER TABLE public.cadets DISABLE ROW LEVEL SECURITY;
