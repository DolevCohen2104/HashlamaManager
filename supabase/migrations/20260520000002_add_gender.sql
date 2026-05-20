-- Add gender column to cadets table
ALTER TABLE public.cadets ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female')) DEFAULT 'male';
