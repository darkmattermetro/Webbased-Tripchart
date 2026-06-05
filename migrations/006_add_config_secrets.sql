-- Migration 006: Add config secrets for registration code and admin secret code
-- These values were previously hardcoded in app.js source code.
-- Run this in Supabase SQL Editor before deploying the updated app.js.

INSERT INTO app_config (config_key, config_value)
VALUES ('registration_code', 'satvik'), ('admin_secret_code', 'mudit')
ON CONFLICT (config_key) DO NOTHING;
