-- Migration for Google OAuth 2.0 security and session management
-- Created: 2024-12-31
-- Purpose: Add tables and functions for OAuth security monitoring

-- Create session_activities table for security audit trail
CREATE TABLE IF NOT EXISTS session_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    additional_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX idx_session_activities_user_created (user_id, created_at DESC),
    INDEX idx_session_activities_action_created (action, created_at DESC),
    INDEX idx_session_activities_ip_created (ip_address, created_at DESC)
);

-- Add RLS policies for session_activities
ALTER TABLE session_activities ENABLE ROW LEVEL SECURITY;

-- Users can only see their own session activities
CREATE POLICY "Users can view their own session activities" ON session_activities
    FOR SELECT USING (auth.uid() = user_id);

-- Only system can insert session activities (via service role)
CREATE POLICY "System can insert session activities" ON session_activities
    FOR INSERT WITH CHECK (true);

-- Add OAuth provider info to users table metadata
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS oauth_providers JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_oauth_login TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS oauth_login_count INTEGER DEFAULT 0;

-- Function to track OAuth login
CREATE OR REPLACE FUNCTION track_oauth_login()
RETURNS TRIGGER AS $$
BEGIN
    -- Update OAuth tracking in users table
    UPDATE users 
    SET 
        last_oauth_login = NOW(),
        oauth_login_count = COALESCE(oauth_login_count, 0) + 1,
        oauth_providers = COALESCE(oauth_providers, '{}'::jsonb) || 
                         jsonb_build_object(
                             COALESCE(NEW.raw_user_meta_data->>'provider', 'unknown'), 
                             jsonb_build_object(
                                 'last_login', NOW(),
                                 'login_count', COALESCE((oauth_providers->(NEW.raw_user_meta_data->>'provider')->>'login_count')::integer, 0) + 1
                             )
                         )
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on auth.users updates (OAuth logins)
DROP TRIGGER IF EXISTS on_oauth_login ON auth.users;
CREATE TRIGGER on_oauth_login
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    WHEN (NEW.raw_user_meta_data->>'provider' IS NOT NULL)
    EXECUTE FUNCTION track_oauth_login();

-- Function to detect suspicious activity
CREATE OR REPLACE FUNCTION detect_suspicious_activity(
    p_user_id UUID,
    p_ip_address INET,
    p_time_window INTERVAL DEFAULT '1 hour'::INTERVAL
)
RETURNS JSONB AS $$
DECLARE
    unique_ips INTEGER;
    recent_logins INTEGER;
    result JSONB;
BEGIN
    -- Count unique IPs in time window
    SELECT COUNT(DISTINCT ip_address) INTO unique_ips
    FROM session_activities
    WHERE user_id = p_user_id 
      AND created_at > NOW() - p_time_window
      AND action IN ('oauth_success', 'login_success');
    
    -- Count recent login attempts
    SELECT COUNT(*) INTO recent_logins
    FROM session_activities
    WHERE user_id = p_user_id 
      AND created_at > NOW() - '15 minutes'::INTERVAL
      AND action LIKE '%login%';
    
    -- Build result
    result := jsonb_build_object(
        'is_suspicious', (unique_ips > 3 OR recent_logins > 10),
        'unique_ips', unique_ips,
        'recent_logins', recent_logins,
        'should_block', (unique_ips > 5 OR recent_logins > 15),
        'reasons', CASE 
            WHEN unique_ips > 5 THEN '["too_many_ips", "potential_compromise"]'::jsonb
            WHEN unique_ips > 3 THEN '["multiple_ips"]'::jsonb
            WHEN recent_logins > 15 THEN '["too_many_attempts", "potential_brute_force"]'::jsonb
            WHEN recent_logins > 10 THEN '["frequent_attempts"]'::jsonb
            ELSE '[]'::jsonb
        END
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old session activities
CREATE OR REPLACE FUNCTION cleanup_old_session_activities(
    p_days_to_keep INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM session_activities 
    WHERE created_at < NOW() - (p_days_to_keep || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log cleanup activity
    INSERT INTO session_activities (
        user_id, 
        action, 
        additional_data
    ) VALUES (
        NULL,
        'system_cleanup',
        jsonb_build_object('deleted_count', deleted_count, 'days_kept', p_days_to_keep)
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create scheduled job for cleanup (if pg_cron is available)
-- SELECT cron.schedule('cleanup-sessions', '0 2 * * *', 'SELECT cleanup_old_session_activities(30);');

-- Add indexes for OAuth-specific queries
CREATE INDEX IF NOT EXISTS idx_users_oauth_providers ON users USING GIN (oauth_providers);
CREATE INDEX IF NOT EXISTS idx_users_last_oauth_login ON users (last_oauth_login DESC) WHERE last_oauth_login IS NOT NULL;

-- Create view for OAuth analytics
CREATE OR REPLACE VIEW oauth_analytics AS
SELECT 
    u.id as user_id,
    u.email,
    u.created_at as user_created_at,
    u.last_oauth_login,
    u.oauth_login_count,
    u.oauth_providers,
    o.name as organization_name,
    o.plan_id,
    COUNT(sa.id) as total_activities,
    COUNT(sa.id) FILTER (WHERE sa.action = 'oauth_success') as successful_logins,
    COUNT(sa.id) FILTER (WHERE sa.action = 'oauth_error') as failed_logins,
    COUNT(DISTINCT sa.ip_address) as unique_ips,
    MAX(sa.created_at) as last_activity
FROM users u
LEFT JOIN organizations o ON u.current_organization_id = o.id
LEFT JOIN session_activities sa ON u.id = sa.user_id AND sa.action LIKE 'oauth_%'
WHERE u.oauth_providers IS NOT NULL
GROUP BY u.id, u.email, u.created_at, u.last_oauth_login, u.oauth_login_count, 
         u.oauth_providers, o.name, o.plan_id;

-- Grant access to the view
GRANT SELECT ON oauth_analytics TO authenticated;

-- RLS policy for the view
CREATE POLICY "Users can view OAuth analytics for their organization" ON oauth_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.organization_id = oauth_analytics.organization_id
            AND om.user_id = auth.uid()
            AND om.role IN ('owner', 'admin')
        )
    );

-- Add helpful comments
COMMENT ON TABLE session_activities IS 'Audit trail for all session activities including OAuth flows';
COMMENT ON FUNCTION detect_suspicious_activity IS 'Analyzes user activity patterns to detect potential security issues';
COMMENT ON FUNCTION cleanup_old_session_activities IS 'Removes old session activity records to maintain performance';
COMMENT ON VIEW oauth_analytics IS 'Analytics view for OAuth usage and security monitoring';