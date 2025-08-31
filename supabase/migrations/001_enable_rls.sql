-- ====================================
-- Enable Row Level Security (RLS)
-- ====================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_payments ENABLE ROW LEVEL SECURITY;

-- ====================================
-- Users table policies
-- ====================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid()::text = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid()::text = id);

-- Allow user creation during signup
CREATE POLICY "Enable insert for authenticated users only" ON users
    FOR INSERT WITH CHECK (auth.uid()::text = id);

-- ====================================
-- API Credentials policies
-- ====================================

-- Users can only see their own API credentials
CREATE POLICY "Users can view own API credentials" ON api_credentials
    FOR SELECT USING (auth.uid()::text = "userId");

-- Users can manage their own API credentials
CREATE POLICY "Users can insert own API credentials" ON api_credentials
    FOR INSERT WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update own API credentials" ON api_credentials
    FOR UPDATE USING (auth.uid()::text = "userId");

CREATE POLICY "Users can delete own API credentials" ON api_credentials
    FOR DELETE USING (auth.uid()::text = "userId");

-- ====================================
-- Social Accounts policies
-- ====================================

CREATE POLICY "Users can view own social accounts" ON social_accounts
    FOR SELECT USING (auth.uid()::text = "userId");

CREATE POLICY "Users can manage own social accounts" ON social_accounts
    FOR ALL USING (auth.uid()::text = "userId");

-- ====================================
-- Projects policies
-- ====================================

CREATE POLICY "Users can view own projects" ON projects
    FOR SELECT USING (auth.uid()::text = "userId");

CREATE POLICY "Users can manage own projects" ON projects
    FOR ALL USING (auth.uid()::text = "userId");

-- ====================================
-- Jobs policies
-- ====================================

CREATE POLICY "Users can view own jobs" ON jobs
    FOR SELECT USING (auth.uid()::text = "userId");

CREATE POLICY "Users can create own jobs" ON jobs
    FOR INSERT WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update own jobs" ON jobs
    FOR UPDATE USING (auth.uid()::text = "userId");

-- ====================================
-- Assets policies
-- ====================================

CREATE POLICY "Users can view own assets" ON assets
    FOR SELECT USING (auth.uid()::text = "userId");

CREATE POLICY "Users can manage own assets" ON assets
    FOR ALL USING (auth.uid()::text = "userId");

-- ====================================
-- Posts policies
-- ====================================

CREATE POLICY "Users can view own posts" ON posts
    FOR SELECT USING (auth.uid()::text = "userId");

CREATE POLICY "Users can manage own posts" ON posts
    FOR ALL USING (auth.uid()::text = "userId");

-- ====================================
-- Prompts policies
-- ====================================

-- Users can view their own prompts and public templates
CREATE POLICY "Users can view prompts" ON prompts
    FOR SELECT USING (
        auth.uid()::text = "userId" 
        OR "isPublic" = true
    );

-- Users can manage their own prompts
CREATE POLICY "Users can manage own prompts" ON prompts
    FOR ALL USING (auth.uid()::text = "userId");

-- ====================================
-- Plans policies (read-only for users)
-- ====================================

-- Anyone can view active plans
CREATE POLICY "Anyone can view active plans" ON plans
    FOR SELECT USING ("isActive" = true);

-- ====================================
-- Credit Ledger policies
-- ====================================

CREATE POLICY "Users can view own credit ledger" ON credit_ledger
    FOR SELECT USING (auth.uid()::text = "userId");

-- Only system can insert credit ledger entries
CREATE POLICY "System can manage credit ledger" ON credit_ledger
    FOR INSERT WITH CHECK (false);

-- ====================================
-- Usage Events policies
-- ====================================

CREATE POLICY "Users can view own usage events" ON usage_events
    FOR SELECT USING (auth.uid()::text = "userId");

-- ====================================
-- Stripe tables policies
-- ====================================

-- Stripe webhooks - only system access
CREATE POLICY "System only access to stripe webhooks" ON stripe_webhooks
    FOR ALL USING (false);

-- Stripe customers
CREATE POLICY "Users can view own stripe customer" ON stripe_customers
    FOR SELECT USING (auth.uid()::text = "userId");

-- Stripe payments
CREATE POLICY "Users can view own payments" ON stripe_payments
    FOR SELECT USING (auth.uid()::text = "userId");