-- Add new columns to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS link_url TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_category TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS creator_name TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS creator_role TEXT;

-- Drop the existing constraint for target_type and add a new one that allows 'teams'
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_target_type_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_target_type_check CHECK (target_type IN ('individual', 'team', 'teams', 'all'));
