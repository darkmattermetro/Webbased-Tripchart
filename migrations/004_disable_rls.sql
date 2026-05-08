-- Migration 004: Disable RLS on ALL tables
-- Run this in Supabase SQL Editor
-- WARNING: This removes all row-level security. Anyone with the anon key can read/write all data.

-- Disable RLS on core tables (must exist)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE trip_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_logs DISABLE ROW LEVEL SECURITY;

-- Disable RLS on optional tables (may not exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'message_activity_log') THEN
    EXECUTE 'ALTER TABLE message_activity_log DISABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Enable anon select" ON message_activity_log';
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'form_activity_log') THEN
    EXECUTE 'ALTER TABLE form_activity_log DISABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- Drop ALL existing RLS policies on guaranteed tables
DROP POLICY IF EXISTS "Enable all for anon" ON profiles;
DROP POLICY IF EXISTS "Public profiles select" ON profiles;
DROP POLICY IF EXISTS "Public profiles insert" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can delete orphan profiles" ON profiles;

DROP POLICY IF EXISTS "Enable anon access" ON app_config;

DROP POLICY IF EXISTS "Enable anon select" ON trip_data;

DROP POLICY IF EXISTS "Enable anon insert" ON visitor_logs;

-- Clean up orphan profiles (optional)
DELETE FROM profiles WHERE emp_id = '18811';
