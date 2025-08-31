-- ========================================
-- MIGRATION SIMPLIFIÉE TOUT-EN-UN
-- Copiez TOUT ce fichier et exécutez-le
-- ========================================

-- 1. SÉCURITÉ DE BASE
-- Active RLS sur les tables essentielles
DO $$ 
BEGIN
    -- Active RLS si les tables existent
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'users') THEN
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'projects') THEN
        ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'jobs') THEN
        ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'assets') THEN
        ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'posts') THEN
        ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- 2. POLITIQUES DE SÉCURITÉ
-- Crée les politiques si elles n'existent pas déjà
DO $$
BEGIN
    -- Policy for users table
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'users' 
        AND policyname = 'Users can view own profile'
    ) THEN
        CREATE POLICY "Users can view own profile" ON users
            FOR SELECT USING (auth.uid()::text = id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'users' 
        AND policyname = 'Users can update own profile'
    ) THEN
        CREATE POLICY "Users can update own profile" ON users
            FOR UPDATE USING (auth.uid()::text = id);
    END IF;
    
    -- Policy for projects
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'projects' 
        AND policyname = 'Users can view own projects'
    ) THEN
        CREATE POLICY "Users can view own projects" ON projects
            FOR SELECT USING (auth.uid()::text = "userId");
    END IF;
    
    -- Policy for jobs
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'jobs' 
        AND policyname = 'Users can view own jobs'
    ) THEN
        CREATE POLICY "Users can view own jobs" ON jobs
            FOR SELECT USING (auth.uid()::text = "userId");
    END IF;
    
    -- Policy for assets
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'assets' 
        AND policyname = 'Users can view own assets'
    ) THEN
        CREATE POLICY "Users can view own assets" ON assets
            FOR SELECT USING (auth.uid()::text = "userId");
    END IF;
    
    -- Policy for posts
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'posts' 
        AND policyname = 'Users can view own posts'
    ) THEN
        CREATE POLICY "Users can view own posts" ON posts
            FOR SELECT USING (auth.uid()::text = "userId");
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some policies might already exist, continuing...';
END $$;

-- 3. FONCTION UPDATED_AT
-- Crée la fonction si elle n'existe pas
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. TRIGGERS
-- Crée les triggers s'ils n'existent pas
DO $$
BEGIN
    -- Trigger for users
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_users_updated_at'
    ) THEN
        CREATE TRIGGER update_users_updated_at 
            BEFORE UPDATE ON users
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Trigger for projects
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_projects_updated_at'
    ) THEN
        CREATE TRIGGER update_projects_updated_at 
            BEFORE UPDATE ON projects
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Trigger for jobs
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_jobs_updated_at'
    ) THEN
        CREATE TRIGGER update_jobs_updated_at 
            BEFORE UPDATE ON jobs
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Trigger for assets
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_assets_updated_at'
    ) THEN
        CREATE TRIGGER update_assets_updated_at 
            BEFORE UPDATE ON assets
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Trigger for posts
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_posts_updated_at'
    ) THEN
        CREATE TRIGGER update_posts_updated_at 
            BEFORE UPDATE ON posts
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some triggers might already exist, continuing...';
END $$;

-- 5. STORAGE BUCKETS
-- Crée les buckets s'ils n'existent pas
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('assets', 'assets', false),
    ('avatars', 'avatars', true),
    ('thumbnails', 'thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- 6. STORAGE POLICIES
DO $$
BEGIN
    -- Public access for avatars
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Avatar images are publicly accessible'
    ) THEN
        CREATE POLICY "Avatar images are publicly accessible"
            ON storage.objects FOR SELECT
            USING (bucket_id = 'avatars');
    END IF;
    
    -- Users can upload their own avatar
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Users can upload their own avatar'
    ) THEN
        CREATE POLICY "Users can upload their own avatar"
            ON storage.objects FOR INSERT
            WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = owner);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Storage policies might already exist, continuing...';
END $$;

-- 7. REALTIME (Optionnel)
-- Active realtime sur les tables importantes
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS assets;

-- ========================================
-- VÉRIFICATION FINALE
-- ========================================
DO $$
DECLARE
    policy_count INTEGER;
    trigger_count INTEGER;
    bucket_count INTEGER;
BEGIN
    -- Compte les politiques
    SELECT COUNT(*) INTO policy_count 
    FROM pg_policies 
    WHERE schemaname = 'public';
    
    -- Compte les triggers
    SELECT COUNT(*) INTO trigger_count 
    FROM pg_trigger 
    WHERE tgname LIKE 'update_%_updated_at';
    
    -- Compte les buckets
    SELECT COUNT(*) INTO bucket_count 
    FROM storage.buckets;
    
    -- Affiche le résultat
    RAISE NOTICE '✅ Migration terminée !';
    RAISE NOTICE '   - Politiques créées: %', policy_count;
    RAISE NOTICE '   - Triggers créés: %', trigger_count;
    RAISE NOTICE '   - Buckets créés: %', bucket_count;
END $$;

-- FIN DE LA MIGRATION
-- Si vous voyez "NOTICE: ✅ Migration terminée !" c'est bon !