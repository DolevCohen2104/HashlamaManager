-- 1. Add 'role' column to cadets table (replacing specific_role)
ALTER TABLE public.cadets DROP COLUMN IF EXISTS specific_role;
ALTER TABLE public.cadets ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'צוער';

-- 2. Drop the users table completely
DROP TABLE IF EXISTS public.users CASCADE;

-- 3. Drop the old enum type if it exists (not strictly necessary but cleaner)
DROP TYPE IF EXISTS user_role CASCADE;
