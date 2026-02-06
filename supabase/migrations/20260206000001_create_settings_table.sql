-- Create settings table to store GA4 refresh token and other app settings
CREATE TABLE IF NOT EXISTS settings (
  id BIGSERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role has full access to settings"
  ON settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to read settings (except sensitive ones)
CREATE POLICY "Authenticated users can read non-sensitive settings"
  ON settings
  FOR SELECT
  TO authenticated
  USING (key NOT IN ('ga4_refresh_token', 'ga4_access_token'));

-- Create index on key for faster lookups
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- Add comment
COMMENT ON TABLE settings IS 'Application settings and configuration values';
