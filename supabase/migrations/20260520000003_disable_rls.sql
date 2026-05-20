-- Disable RLS on all tables since we are moving to a purely client-side authentication model
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cadets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to keep the schema clean
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

-- Modify the users table to drop the id column entirely and use personal_id as PK
ALTER TABLE public.users DROP COLUMN IF EXISTS id CASCADE;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_pkey CASCADE;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_personal_id_key CASCADE;
ALTER TABLE public.users ADD PRIMARY KEY (personal_id);
