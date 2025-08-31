-- ====================================
-- Realtime Configuration
-- ====================================

-- Enable realtime for specific tables
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE assets;
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE credit_ledger;

-- Create realtime configuration for job progress updates
CREATE OR REPLACE FUNCTION broadcast_job_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- Broadcast job progress updates to the user's channel
    PERFORM pg_notify(
        'job_progress_' || NEW."userId",
        json_build_object(
            'jobId', NEW.id,
            'status', NEW.status,
            'progress', NEW.progress,
            'estimatedTimeRemaining', NEW."estimatedTimeRemaining",
            'errorMessage', NEW."errorMessage"
        )::text
    );
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER broadcast_job_updates
    AFTER UPDATE OF status, progress ON jobs
    FOR EACH ROW 
    WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.progress IS DISTINCT FROM NEW.progress)
    EXECUTE FUNCTION broadcast_job_progress();

-- ====================================
-- Analytics Views
-- ====================================

-- View for user statistics
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    u.id as user_id,
    u.email,
    u."planId" as plan,
    u."creditsBalance" as credits_balance,
    COUNT(DISTINCT j.id) FILTER (WHERE j."createdAt" >= CURRENT_DATE - INTERVAL '30 days') as jobs_last_30_days,
    COUNT(DISTINCT a.id) FILTER (WHERE a."createdAt" >= CURRENT_DATE - INTERVAL '30 days') as assets_last_30_days,
    COUNT(DISTINCT p.id) FILTER (WHERE p."createdAt" >= CURRENT_DATE - INTERVAL '30 days') as posts_last_30_days,
    COALESCE(SUM(a."fileSize"), 0) as total_storage_bytes,
    u."createdAt" as user_created_at
FROM users u
LEFT JOIN jobs j ON u.id = j."userId"
LEFT JOIN assets a ON u.id = a."userId" AND a.status = 'ready'
LEFT JOIN posts p ON u.id = p."userId"
GROUP BY u.id;

-- View for daily usage
CREATE OR REPLACE VIEW daily_usage AS
SELECT 
    DATE("createdAt") as date,
    "userId",
    COUNT(*) FILTER (WHERE type = 'generation') as generations,
    COUNT(*) FILTER (WHERE type = 'publishing') as publications,
    COUNT(*) FILTER (WHERE status = 'completed') as completed,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    AVG("actualTime") FILTER (WHERE "actualTime" IS NOT NULL) as avg_processing_time
FROM jobs
GROUP BY DATE("createdAt"), "userId";

-- View for platform statistics
CREATE OR REPLACE VIEW platform_stats AS
SELECT 
    platform,
    COUNT(DISTINCT "userId") as unique_users,
    COUNT(*) as total_posts,
    COUNT(*) FILTER (WHERE status = 'published') as published_posts,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_posts,
    AVG(("performanceData"->>'views')::INT) as avg_views,
    AVG(("performanceData"->>'likes')::INT) as avg_likes
FROM posts
WHERE platform IS NOT NULL
GROUP BY platform;

-- ====================================
-- Indexes for Performance
-- ====================================

-- Additional indexes for common queries
CREATE INDEX IF NOT EXISTS idx_jobs_user_created ON jobs("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_assets_user_status ON assets("userId", status);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled ON posts("scheduledAt") WHERE "scheduledAt" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_credit_ledger_user_created ON credit_ledger("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_usage_events_user_event ON usage_events("userId", event, "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_user ON stripe_payments("userId", "createdAt" DESC);

-- Indexes for text search
CREATE INDEX IF NOT EXISTS idx_prompts_title_gin ON prompts USING gin(to_tsvector('french', title));
CREATE INDEX IF NOT EXISTS idx_prompts_content_gin ON prompts USING gin(to_tsvector('french', content));
CREATE INDEX IF NOT EXISTS idx_posts_title_gin ON posts USING gin(to_tsvector('french', title)) WHERE title IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_description_gin ON posts USING gin(to_tsvector('french', description)) WHERE description IS NOT NULL;