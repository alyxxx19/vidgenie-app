-- ====================================
-- Storage Buckets Configuration
-- ====================================

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection, allowed_mime_types, file_size_limit)
VALUES 
    ('assets', 'assets', false, false, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime', 'audio/mpeg', 'audio/wav'], 524288000), -- 500MB
    ('thumbnails', 'thumbnails', true, true, ARRAY['image/jpeg', 'image/png', 'image/webp'], 5242880), -- 5MB
    ('avatars', 'avatars', true, true, ARRAY['image/jpeg', 'image/png', 'image/webp'], 2097152), -- 2MB
    ('exports', 'exports', false, false, ARRAY['application/zip', 'video/mp4'], 1073741824) -- 1GB
ON CONFLICT (id) DO UPDATE
SET 
    public = EXCLUDED.public,
    avif_autodetection = EXCLUDED.avif_autodetection,
    allowed_mime_types = EXCLUDED.allowed_mime_types,
    file_size_limit = EXCLUDED.file_size_limit;

-- ====================================
-- Storage Policies
-- ====================================

-- Assets bucket policies
CREATE POLICY "Users can upload their own assets" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'assets' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their own assets" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'assets' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own assets" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'assets' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own assets" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'assets' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Thumbnails bucket policies (public read)
CREATE POLICY "Anyone can view thumbnails" ON storage.objects
    FOR SELECT USING (bucket_id = 'thumbnails');

CREATE POLICY "Users can upload their own thumbnails" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'thumbnails' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own thumbnails" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'thumbnails' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own thumbnails" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'thumbnails' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Avatars bucket policies (public read)
CREATE POLICY "Anyone can view avatars" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'avatars' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own avatar" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'avatars' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own avatar" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'avatars' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Exports bucket policies
CREATE POLICY "Users can manage their own exports" ON storage.objects
    FOR ALL USING (
        bucket_id = 'exports' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );