-- First drop the policy that depends on the column
DROP POLICY IF EXISTS "Mammash can manage own team attendance" ON public.attendance_logs;

-- Remove old fields from users
ALTER TABLE public.users DROP COLUMN IF EXISTS full_name;
ALTER TABLE public.users DROP COLUMN IF EXISTS team_number;

-- Make team_number in cadets nullable
ALTER TABLE public.cadets ALTER COLUMN team_number DROP NOT NULL;

-- Recreate Mammash policy
CREATE POLICY "Mammash can manage own team attendance" ON public.attendance_logs FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    JOIN public.cadets c_mammash ON u.personal_id = c_mammash.personal_id
    JOIN public.cadets c_cadet ON c_mammash.team_number = c_cadet.team_number 
    WHERE u.id = auth.uid() AND u.role = 'mammash' AND c_cadet.cadet_id = attendance_logs.cadet_id
  )
);