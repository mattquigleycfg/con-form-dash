-- Create social_media_metrics table
CREATE TABLE IF NOT EXISTS public.social_media_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  linkedin_followers INTEGER DEFAULT 0,
  facebook_followers INTEGER DEFAULT 0,
  instagram_followers INTEGER DEFAULT 0,
  twitter_followers INTEGER DEFAULT 0,
  youtube_subscribers INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_by_user_id UUID REFERENCES auth.users(id),
  notes TEXT
);

-- Add RLS policies
ALTER TABLE public.social_media_metrics ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY \
Allow
authenticated
users
to
read
social
media
metrics\
  ON public.social_media_metrics
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert
CREATE POLICY \Allow
authenticated
users
to
insert
social
media
metrics\
  ON public.social_media_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create index on updated_at for faster queries
CREATE INDEX IF NOT EXISTS social_media_metrics_updated_at_idx 
  ON public.social_media_metrics(updated_at DESC);

-- Insert initial data (from LinkedIn page: 2,578 followers)
INSERT INTO public.social_media_metrics (linkedin_followers, facebook_followers, instagram_followers)
VALUES (2578, 0, 0)
ON CONFLICT DO NOTHING;
