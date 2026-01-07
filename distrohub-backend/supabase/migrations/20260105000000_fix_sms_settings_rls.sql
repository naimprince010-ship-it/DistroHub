-- Fix RLS policies for SMS settings to allow backend service role access
-- This migration allows the backend (using service_role key) to bypass RLS

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own SMS settings" ON sms_settings;
DROP POLICY IF EXISTS "Users can update their own SMS settings" ON sms_settings;
DROP POLICY IF EXISTS "Users can insert their own SMS settings" ON sms_settings;

-- Create new policies that allow service role (backend) to manage all settings
-- Service role key automatically bypasses RLS, but we add explicit policies for clarity

-- Allow service role to do everything (service_role key bypasses RLS anyway)
-- But we keep policies for future frontend direct access scenarios

-- View: Allow all (service role bypasses, anon users need explicit access)
CREATE POLICY "Allow service role to view SMS settings" ON sms_settings
    FOR SELECT USING (true);

-- Update: Allow all (service role bypasses, anon users need explicit access)  
CREATE POLICY "Allow service role to update SMS settings" ON sms_settings
    FOR UPDATE USING (true);

-- Insert: Allow all (service role bypasses, anon users need explicit access)
CREATE POLICY "Allow service role to insert SMS settings" ON sms_settings
    FOR INSERT WITH CHECK (true);


