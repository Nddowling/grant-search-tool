-- Agency Profiles Table
-- Stores organization profiles for grant matching and notifications

CREATE TABLE IF NOT EXISTS agency_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Link to leads table (using BIGINT to match leads.id type)
  lead_id BIGINT REFERENCES leads(id) ON DELETE CASCADE,
  email TEXT NOT NULL,

  -- Organization info
  organization_name TEXT NOT NULL,
  organization_type TEXT NOT NULL, -- nonprofit, small_business, university, government, tribal, individual
  ein TEXT, -- Employer Identification Number (optional)

  -- Location
  state TEXT,
  city TEXT,
  zip_code TEXT,

  -- Grant preferences
  focus_areas TEXT[] DEFAULT '{}', -- education, healthcare, environment, research, arts, housing, etc.
  keywords TEXT[] DEFAULT '{}', -- Custom keywords they're interested in
  min_grant_amount INTEGER DEFAULT 0,
  max_grant_amount INTEGER,
  preferred_sources TEXT[] DEFAULT '{}', -- grants_gov, sam_gov, nih, nsf, fema, etc.

  -- Notification preferences
  notification_frequency TEXT DEFAULT 'weekly', -- daily, weekly, monthly, none
  email_notifications BOOLEAN DEFAULT true,
  last_notification_sent TIMESTAMPTZ,

  -- Subscription tier
  subscription_tier TEXT DEFAULT 'free', -- free, pro, premium
  subscription_expires_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(email)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_agency_profiles_email ON agency_profiles(email);
CREATE INDEX IF NOT EXISTS idx_agency_profiles_notification ON agency_profiles(notification_frequency, email_notifications);
CREATE INDEX IF NOT EXISTS idx_agency_profiles_subscription ON agency_profiles(subscription_tier);

-- Grant matches table - stores matched grants for each profile
CREATE TABLE IF NOT EXISTS grant_matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES agency_profiles(id) ON DELETE CASCADE,

  -- Grant info (denormalized for email sending)
  grant_id TEXT NOT NULL,
  grant_title TEXT NOT NULL,
  grant_agency TEXT,
  grant_amount TEXT,
  grant_deadline TEXT,
  grant_source TEXT NOT NULL,
  grant_link TEXT,
  grant_description TEXT,

  -- Match details
  match_score INTEGER DEFAULT 0, -- 0-100 score
  match_reasons TEXT[] DEFAULT '{}', -- why it matched

  -- Status
  status TEXT DEFAULT 'new', -- new, sent, viewed, applied, dismissed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,

  -- Prevent duplicate matches
  UNIQUE(profile_id, grant_id, grant_source)
);

-- Index for fetching unsent matches
CREATE INDEX IF NOT EXISTS idx_grant_matches_status ON grant_matches(profile_id, status);
CREATE INDEX IF NOT EXISTS idx_grant_matches_created ON grant_matches(created_at);

-- Notification log table
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES agency_profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,

  notification_type TEXT NOT NULL, -- grant_match, weekly_digest, deadline_reminder
  grants_included INTEGER DEFAULT 0,

  status TEXT DEFAULT 'pending', -- pending, sent, failed
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notification_log_profile ON notification_log(profile_id, created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for agency_profiles
DROP TRIGGER IF EXISTS update_agency_profiles_updated_at ON agency_profiles;
CREATE TRIGGER update_agency_profiles_updated_at
  BEFORE UPDATE ON agency_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
