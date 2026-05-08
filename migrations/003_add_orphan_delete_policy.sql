-- Migration 003: Allow admins to delete orphan profiles (auth_id IS NULL)
-- Run this in Supabase SQL Editor

-- Drop existing DELETE policy first to avoid conflicts
DROP POLICY IF EXISTS "Admins can delete orphan profiles" ON profiles;

-- Create new policy
CREATE POLICY "Admins can delete orphan profiles"
ON profiles
FOR DELETE
USING (
  auth_id IS NULL
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE auth_id = auth.uid()
    AND access_level = 'admin'
  )
);

-- Optional: Clean up known orphan
-- DELETE FROM profiles WHERE emp_id = '18811';
