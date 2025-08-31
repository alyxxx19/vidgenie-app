-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_payments ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's organizations
CREATE OR REPLACE FUNCTION get_user_organizations(user_uuid UUID)
RETURNS TABLE(organization_id UUID, role user_role) AS $$
BEGIN
  RETURN QUERY
  SELECT om.organization_id, om.role
  FROM organization_members om
  WHERE om.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is organization member
CREATE OR REPLACE FUNCTION is_organization_member(user_uuid UUID, org_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members 
    WHERE user_id = user_uuid AND organization_id = org_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users policies
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can be created via signup" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Organizations policies
CREATE POLICY "Organization owners and admins can read" ON organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_id = organizations.id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Organization owners can update" ON organizations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_id = organizations.id 
      AND user_id = auth.uid() 
      AND role = 'owner'
    )
  );

CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Organization members policies
CREATE POLICY "Organization members can read membership" ON organization_members
  FOR SELECT USING (
    user_id = auth.uid() OR 
    is_organization_member(auth.uid(), organization_id)
  );

CREATE POLICY "Organization owners and admins can manage members" ON organization_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id 
      AND om.user_id = auth.uid() 
      AND om.role IN ('owner', 'admin')
    )
  );

-- Projects policies
CREATE POLICY "Organization members can read projects" ON projects
  FOR SELECT USING (is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can create projects" ON projects
  FOR INSERT WITH CHECK (
    is_organization_member(auth.uid(), organization_id) AND
    auth.uid() = user_id
  );

CREATE POLICY "Project creators and org admins can update projects" ON projects
  FOR UPDATE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_id = projects.organization_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- Jobs policies
CREATE POLICY "Organization members can read jobs" ON jobs
  FOR SELECT USING (is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Users can create jobs in their organizations" ON jobs
  FOR INSERT WITH CHECK (
    is_organization_member(auth.uid(), organization_id) AND
    auth.uid() = user_id
  );

CREATE POLICY "Job creators can update their jobs" ON jobs
  FOR UPDATE USING (auth.uid() = user_id);

-- Assets policies
CREATE POLICY "Organization members can read assets" ON assets
  FOR SELECT USING (is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Users can create assets in their organizations" ON assets
  FOR INSERT WITH CHECK (
    is_organization_member(auth.uid(), organization_id) AND
    auth.uid() = user_id
  );

CREATE POLICY "Asset creators and org admins can update assets" ON assets
  FOR UPDATE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_id = assets.organization_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- Posts policies
CREATE POLICY "Organization members can read posts" ON posts
  FOR SELECT USING (is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Users can create posts in their organizations" ON posts
  FOR INSERT WITH CHECK (
    is_organization_member(auth.uid(), organization_id) AND
    auth.uid() = user_id
  );

CREATE POLICY "Post creators can update their posts" ON posts
  FOR UPDATE USING (auth.uid() = user_id);

-- Prompts policies
CREATE POLICY "Users can read public prompts or own prompts" ON prompts
  FOR SELECT USING (
    is_public = TRUE OR 
    user_id = auth.uid() OR
    (organization_id IS NOT NULL AND is_organization_member(auth.uid(), organization_id))
  );

CREATE POLICY "Users can create prompts" ON prompts
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    (organization_id IS NULL OR is_organization_member(auth.uid(), organization_id))
  );

CREATE POLICY "Users can update their own prompts" ON prompts
  FOR UPDATE USING (auth.uid() = user_id);

-- Credit ledger policies
CREATE POLICY "Organization members can read credit ledger" ON credit_ledger
  FOR SELECT USING (is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Users can create credit entries for their organizations" ON credit_ledger
  FOR INSERT WITH CHECK (
    is_organization_member(auth.uid(), organization_id) AND
    auth.uid() = user_id
  );

-- Usage events policies
CREATE POLICY "Organization members can read usage events" ON usage_events
  FOR SELECT USING (
    organization_id IS NULL OR 
    is_organization_member(auth.uid(), organization_id)
  );

CREATE POLICY "Users can create usage events" ON usage_events
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    (organization_id IS NULL OR is_organization_member(auth.uid(), organization_id))
  );

-- API credentials policies
CREATE POLICY "Organization members can read API credentials" ON api_credentials
  FOR SELECT USING (is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Organization owners and admins can manage API credentials" ON api_credentials
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_id = api_credentials.organization_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- Social accounts policies
CREATE POLICY "Organization members can read social accounts" ON social_accounts
  FOR SELECT USING (is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Users can manage their social accounts" ON social_accounts
  FOR ALL USING (
    auth.uid() = user_id AND
    is_organization_member(auth.uid(), organization_id)
  );

-- Stripe webhooks policies (admin only)
CREATE POLICY "Service role can manage stripe webhooks" ON stripe_webhooks
  FOR ALL USING (auth.role() = 'service_role');

-- Stripe customers policies
CREATE POLICY "Users can read their stripe customer data" ON stripe_customers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage stripe customers" ON stripe_customers
  FOR ALL USING (auth.role() = 'service_role');

-- Stripe payments policies
CREATE POLICY "Organization members can read stripe payments" ON stripe_payments
  FOR SELECT USING (
    auth.uid() = user_id OR
    (organization_id IS NOT NULL AND is_organization_member(auth.uid(), organization_id))
  );

CREATE POLICY "Service role can manage stripe payments" ON stripe_payments
  FOR INSERT WITH CHECK (auth.role() = 'service_role');