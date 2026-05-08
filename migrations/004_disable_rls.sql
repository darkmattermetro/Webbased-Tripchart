-- Migration 004: Disable RLS on ALL tables
-- Run this in Supabase SQL Editor
-- WARNING: This removes all row-level security. Anyone with the anon key can read/write all data.

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE trip_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_activity_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE form_activity_log DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing RLS policies on these tables
DROP POLICY IF EXISTS "Enable all for anon" ON profiles;
DROP POLICY IF EXISTS "Public profiles select" ON profiles;
DROP POLICY IF EXISTS "Public profiles insert" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can delete orphan profiles" ON profiles;

DROP POLICY IF EXISTS "Enable anon access" ON app_config;

DROP POLICY IF EXISTS "Enable anon select" ON trip_data;

DROP POLICY IF EXISTS "Enable anon select" ON message_activity_log;

DROP POLICY IF EXISTS "Enable anon insert" ON visitor_logs;

-- Clean up orphan profiles (optional)
DELETE FROM profiles WHERE emp_id = '18811';
