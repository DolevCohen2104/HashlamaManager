-- 1. Drop ALL possible policies to keep the schema completely clean
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

-- 2. Completely disable RLS on all tables
-- This means the tables are openly readable and writable by the client
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cadets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs DISABLE ROW LEVEL SECURITY;
