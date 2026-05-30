-- Add PIN code for authentication
ALTER TABLE cadets ADD COLUMN pin_code TEXT DEFAULT NULL;
