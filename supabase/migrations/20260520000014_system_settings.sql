-- Create system_settings table
CREATE TABLE system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default setting for tasks tab
INSERT INTO system_settings (key, value) VALUES ('tasks_tab_enabled', 'true'::jsonb);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Allow read access to all
CREATE POLICY "Allow read access to all on system_settings" ON system_settings FOR SELECT USING (true);

-- Allow all access
CREATE POLICY "Allow all access on system_settings" ON system_settings FOR ALL USING (true);
