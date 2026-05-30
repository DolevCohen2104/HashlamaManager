-- Create roll_calls table
CREATE TABLE roll_calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', -- 'active' or 'closed'
    type TEXT NOT NULL DEFAULT 'general', -- 'home', 'base', 'general'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create roll_call_responses table
CREATE TABLE roll_call_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    roll_call_id UUID REFERENCES roll_calls(id) ON DELETE CASCADE,
    cadet_id TEXT REFERENCES cadets(personal_id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'present',
    responded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(roll_call_id, cadet_id)
);

-- Enable RLS and setup basic policies (everyone can read active roll calls, insert responses)
ALTER TABLE roll_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE roll_call_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to all" ON roll_calls FOR SELECT USING (true);
CREATE POLICY "Allow all access to roll_calls" ON roll_calls FOR ALL USING (true);

CREATE POLICY "Allow read access to all responses" ON roll_call_responses FOR SELECT USING (true);
CREATE POLICY "Allow all access to roll_call_responses" ON roll_call_responses FOR ALL USING (true);
