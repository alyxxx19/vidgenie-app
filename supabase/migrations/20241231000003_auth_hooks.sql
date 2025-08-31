-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  org_id UUID;
BEGIN
  -- Create user profile
  INSERT INTO public.users (
    id,
    email,
    name,
    creator_type,
    platforms,
    preferred_lang,
    timezone,
    plan_id,
    credits_balance
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'solo',
    ARRAY['tiktok'],
    'fr',
    'Europe/Paris',
    'free',
    100
  );

  -- Create default organization for the user
  INSERT INTO public.organizations (
    name,
    slug,
    owner_id,
    plan_id,
    credits_balance
  )
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)) || '''s Workspace',
    lower(regexp_replace(
      COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)) || '-' || substring(NEW.id::text, 1, 8),
      '[^a-zA-Z0-9]+', '-', 'g'
    )),
    NEW.id,
    'free',
    1000
  )
  RETURNING id INTO org_id;

  -- Add user as owner of their organization
  INSERT INTO public.organization_members (
    organization_id,
    user_id,
    role
  )
  VALUES (
    org_id,
    NEW.id,
    'owner'
  );

  -- Set as current organization
  UPDATE public.users 
  SET current_organization_id = org_id 
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle user deletion
CREATE OR REPLACE FUNCTION handle_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete from users table (cascade will handle the rest)
  DELETE FROM public.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_user_delete();

-- Function to get user permissions in organization
CREATE OR REPLACE FUNCTION get_user_role_in_organization(user_uuid UUID, org_uuid UUID)
RETURNS user_role AS $$
DECLARE
  user_role_result user_role;
BEGIN
  SELECT role INTO user_role_result
  FROM organization_members
  WHERE user_id = user_uuid AND organization_id = org_uuid;
  
  RETURN user_role_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can access organization resource
CREATE OR REPLACE FUNCTION can_access_organization_resource(user_uuid UUID, org_uuid UUID, required_role user_role DEFAULT 'viewer')
RETURNS BOOLEAN AS $$
DECLARE
  user_role_result user_role;
  role_hierarchy INTEGER;
  required_hierarchy INTEGER;
BEGIN
  -- Get user role in organization
  SELECT role INTO user_role_result
  FROM organization_members
  WHERE user_id = user_uuid AND organization_id = org_uuid;
  
  IF user_role_result IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Define role hierarchy (higher number = more permissions)
  role_hierarchy := CASE user_role_result
    WHEN 'viewer' THEN 1
    WHEN 'member' THEN 2
    WHEN 'admin' THEN 3
    WHEN 'owner' THEN 4
    ELSE 0
  END;
  
  required_hierarchy := CASE required_role
    WHEN 'viewer' THEN 1
    WHEN 'member' THEN 2
    WHEN 'admin' THEN 3
    WHEN 'owner' THEN 4
    ELSE 0
  END;
  
  RETURN role_hierarchy >= required_hierarchy;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's current organization
CREATE OR REPLACE FUNCTION get_current_organization()
RETURNS UUID AS $$
DECLARE
  org_id UUID;
BEGIN
  SELECT current_organization_id INTO org_id
  FROM users
  WHERE id = auth.uid();
  
  RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to deduct credits safely
CREATE OR REPLACE FUNCTION deduct_credits(
  user_uuid UUID,
  org_uuid UUID,
  amount INTEGER,
  description TEXT,
  job_uuid UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  current_balance INTEGER;
BEGIN
  -- Check current balance
  SELECT credits_balance INTO current_balance
  FROM organizations
  WHERE id = org_uuid;
  
  IF current_balance < amount THEN
    RETURN FALSE;
  END IF;
  
  -- Deduct credits from organization
  UPDATE organizations
  SET credits_balance = credits_balance - amount
  WHERE id = org_uuid;
  
  -- Log the transaction
  INSERT INTO credit_ledger (
    user_id,
    organization_id,
    amount,
    type,
    description,
    job_id
  )
  VALUES (
    user_uuid,
    org_uuid,
    -amount,
    'usage',
    description,
    job_uuid
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add credits
CREATE OR REPLACE FUNCTION add_credits(
  user_uuid UUID,
  org_uuid UUID,
  amount INTEGER,
  credit_type TEXT,
  description TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Add credits to organization
  UPDATE organizations
  SET credits_balance = credits_balance + amount
  WHERE id = org_uuid;
  
  -- Log the transaction
  INSERT INTO credit_ledger (
    user_id,
    organization_id,
    amount,
    type,
    description
  )
  VALUES (
    user_uuid,
    org_uuid,
    amount,
    credit_type,
    description
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;