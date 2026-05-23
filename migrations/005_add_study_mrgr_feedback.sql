-- Migration 005: Add study_mrgr_feedback table for MRGR AI feedback form
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS study_mrgr_feedback (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  emp_no TEXT NOT NULL,
  designation TEXT DEFAULT '',
  suggestions TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE study_mrgr_feedback DISABLE ROW LEVEL SECURITY;
