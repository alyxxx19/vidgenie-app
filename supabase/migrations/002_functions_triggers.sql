-- ====================================
-- Database Functions & Triggers
-- ====================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all tables with updatedAt column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_credentials_updated_at BEFORE UPDATE ON api_credentials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_social_accounts_updated_at BEFORE UPDATE ON social_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prompts_updated_at BEFORE UPDATE ON prompts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stripe_customers_updated_at BEFORE UPDATE ON stripe_customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================
-- Function to update user credits balance
-- ====================================

CREATE OR REPLACE FUNCTION update_user_credits_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user's credits balance
    UPDATE users 
    SET "creditsBalance" = "creditsBalance" + NEW.amount
    WHERE id = NEW."userId";
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update credits balance
CREATE TRIGGER update_credits_on_ledger_insert
    AFTER INSERT ON credit_ledger
    FOR EACH ROW EXECUTE FUNCTION update_user_credits_balance();

-- ====================================
-- Function to track usage events
-- ====================================

CREATE OR REPLACE FUNCTION track_job_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Only track when job status changes to completed or failed
    IF NEW.status IN ('completed', 'failed') AND OLD.status NOT IN ('completed', 'failed') THEN
        INSERT INTO usage_events (
            "userId",
            "jobId",
            event,
            metadata,
            duration
        ) VALUES (
            NEW."userId",
            NEW.id,
            'job_' || NEW.status,
            jsonb_build_object(
                'type', NEW.type,
                'projectId', NEW."projectId"
            ),
            EXTRACT(EPOCH FROM (NEW."completedAt" - NEW."startedAt"))::INT
        );
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER track_job_events
    AFTER UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION track_job_completion();

-- ====================================
-- Function to validate API credentials
-- ====================================

CREATE OR REPLACE FUNCTION validate_api_credential()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if provider is valid
    IF NEW.provider NOT IN ('openai', 'midjourney', 'sora', 'replicate', 'anthropic', 'stability') THEN
        RAISE EXCEPTION 'Invalid provider: %', NEW.provider;
    END IF;
    
    -- Ensure encrypted key is not empty
    IF LENGTH(NEW."encryptedKey") < 10 THEN
        RAISE EXCEPTION 'Invalid encrypted key';
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER validate_api_credential_insert
    BEFORE INSERT OR UPDATE ON api_credentials
    FOR EACH ROW EXECUTE FUNCTION validate_api_credential();

-- ====================================
-- Function to create default project for new users
-- ====================================

CREATE OR REPLACE FUNCTION create_default_project()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO projects (
        "userId",
        name,
        description,
        "isDefault"
    ) VALUES (
        NEW.id,
        'Mon Premier Projet',
        'Projet par défaut créé automatiquement',
        true
    );
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER create_default_project_for_user
    AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION create_default_project();

-- ====================================
-- Function to cleanup expired social tokens
-- ====================================

CREATE OR REPLACE FUNCTION cleanup_expired_social_tokens()
RETURNS void AS $$
BEGIN
    UPDATE social_accounts
    SET "isActive" = false
    WHERE "expiresAt" < NOW() AND "isActive" = true;
END;
$$ language 'plpgsql';

-- ====================================
-- Function to get user's current plan details
-- ====================================

CREATE OR REPLACE FUNCTION get_user_plan(user_id TEXT)
RETURNS TABLE(
    plan_name TEXT,
    credits_balance INT,
    credits_per_month INT,
    max_generations_day INT,
    max_storage_gb INT,
    features TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.name,
        u."creditsBalance",
        p."creditsPerMonth",
        p."maxGenerationsDay",
        p."maxStorageGB",
        p.features
    FROM users u
    LEFT JOIN plans p ON u."planId" = p.name
    WHERE u.id = user_id;
END;
$$ language 'plpgsql';

-- ====================================
-- Function to check daily generation limit
-- ====================================

CREATE OR REPLACE FUNCTION check_generation_limit(user_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    daily_count INT;
    max_allowed INT;
BEGIN
    -- Get today's generation count
    SELECT COUNT(*) INTO daily_count
    FROM jobs
    WHERE "userId" = user_id
        AND type = 'generation'
        AND "createdAt" >= CURRENT_DATE
        AND status IN ('pending', 'running', 'completed');
    
    -- Get user's plan limit
    SELECT p."maxGenerationsDay" INTO max_allowed
    FROM users u
    JOIN plans p ON u."planId" = p.name
    WHERE u.id = user_id;
    
    RETURN daily_count < max_allowed;
END;
$$ language 'plpgsql';

-- ====================================
-- Function to calculate storage usage
-- ====================================

CREATE OR REPLACE FUNCTION calculate_user_storage(user_id TEXT)
RETURNS BIGINT AS $$
DECLARE
    total_bytes BIGINT;
BEGIN
    SELECT COALESCE(SUM("fileSize"), 0) INTO total_bytes
    FROM assets
    WHERE "userId" = user_id
        AND status = 'ready';
    
    RETURN total_bytes;
END;
$$ language 'plpgsql';