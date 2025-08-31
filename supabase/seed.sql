-- Seed data for development
-- This file is loaded when running `supabase db reset`

-- Insert test users (will trigger the auth hooks to create profiles and organizations)
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at
) VALUES (
  'dev-user-1',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'dev@vidgenie.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NULL,
  '',
  NULL,
  '',
  NULL,
  '',
  '',
  NULL,
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Dev User"}',
  FALSE,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NULL,
  '',
  0,
  NULL,
  '',
  NULL
), (
  'test-user-1',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'test@vidgenie.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NULL,
  '',
  NULL,
  '',
  NULL,
  '',
  '',
  NULL,
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Test User"}',
  FALSE,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NULL,
  '',
  0,
  NULL,
  '',
  NULL
);

-- Wait for triggers to create users and organizations
-- Then seed additional data

-- Update one user to Pro plan for testing
UPDATE users SET 
  plan_id = 'pro',
  credits_balance = 5000
WHERE email = 'dev@vidgenie.com';

UPDATE organizations SET 
  plan_id = 'pro',
  credits_balance = 5000
WHERE owner_id = 'dev-user-1';

-- Create some test projects
INSERT INTO projects (name, description, organization_id, user_id) 
SELECT 
  'Projet TikTok',
  'Contenu viral pour TikTok',
  o.id,
  'dev-user-1'
FROM organizations o WHERE o.owner_id = 'dev-user-1';

INSERT INTO projects (name, description, organization_id, user_id) 
SELECT 
  'Campagne YouTube',
  'Vidéos éducatives pour YouTube',
  o.id,
  'dev-user-1'
FROM organizations o WHERE o.owner_id = 'dev-user-1';

-- Create test prompts
INSERT INTO prompts (user_id, organization_id, title, content, category, tags, is_template, is_public)
SELECT 
  'dev-user-1',
  o.id,
  'Vidéo Motivation',
  'Crée une vidéo motivante de 30 secondes sur le thème du dépassement de soi avec des visuels dynamiques et une musique énergique.',
  'motivation',
  ARRAY['motivation', 'inspiration', 'sport'],
  TRUE,
  TRUE
FROM organizations o WHERE o.owner_id = 'dev-user-1';

INSERT INTO prompts (user_id, organization_id, title, content, category, tags, is_template, is_public)
SELECT 
  'dev-user-1',
  o.id,
  'Tutoriel Produit',
  'Génère un tutoriel de 60 secondes expliquant comment utiliser [PRODUIT] avec des animations claires et un ton pédagogique.',
  'tutorial',
  ARRAY['tutoriel', 'produit', 'éducation'],
  TRUE,
  TRUE
FROM organizations o WHERE o.owner_id = 'dev-user-1';

-- Create some test assets
INSERT INTO assets (
  user_id, 
  organization_id, 
  filename, 
  mime_type, 
  file_size, 
  duration, 
  width, 
  height,
  s3_key, 
  s3_bucket, 
  s3_region, 
  status,
  prompt,
  ai_config
)
SELECT 
  'dev-user-1',
  o.id,
  'motivation_video_001.mp4',
  'video/mp4',
  2048576,
  30,
  1080,
  1920,
  'dev/motivation_video_001.mp4',
  'vidgenie-media',
  'eu-west-3',
  'ready',
  'Vidéo motivation sur le dépassement de soi',
  '{"platforms": ["tiktok"], "style": "dynamic", "duration": 30}'::jsonb
FROM organizations o WHERE o.owner_id = 'dev-user-1';

-- Create credit ledger entries
INSERT INTO credit_ledger (user_id, organization_id, amount, type, description)
SELECT 
  'dev-user-1',
  o.id,
  100,
  'signup_bonus',
  'Crédits de bienvenue'
FROM organizations o WHERE o.owner_id = 'dev-user-1';

INSERT INTO credit_ledger (user_id, organization_id, amount, type, description)
SELECT 
  'dev-user-1',
  o.id,
  -10,
  'generation',
  'Génération vidéo motivation'
FROM organizations o WHERE o.owner_id = 'dev-user-1';

-- Create usage events
INSERT INTO usage_events (user_id, organization_id, event, platform, provider, metadata, duration)
SELECT 
  'dev-user-1',
  o.id,
  'video_generated',
  'tiktok',
  'openai',
  '{"success": true, "model": "gpt-4", "tokens": 150}'::jsonb,
  45
FROM organizations o WHERE o.owner_id = 'dev-user-1';