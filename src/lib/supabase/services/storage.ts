import { supabase } from '../client';
import { supabaseAdmin } from '../server';

export interface UploadOptions {
  organizationId: string;
  projectId?: string;
  folder?: string;
  isPublic?: boolean;
  metadata?: Record<string, any>;
}

export interface UploadResult {
  id: string;
  path: string;
  publicUrl?: string;
  signedUrl?: string;
}

export class StorageService {
  // Upload file
  static async uploadFile(file: File, options: UploadOptions): Promise<UploadResult> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    // Generate unique file path
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name}`;
    const basePath = `organizations/${options.organizationId}`;
    const folder = options.folder || 'assets';
    const filePath = `${basePath}/${folder}/${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('assets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        metadata: options.metadata,
      });

    if (uploadError) throw uploadError;

    // Get public URL if public
    let publicUrl: string | undefined;
    let signedUrl: string | undefined;

    if (options.isPublic) {
      const { data } = supabase.storage
        .from('assets')
        .getPublicUrl(filePath);
      publicUrl = data.publicUrl;
    } else {
      const { data, error } = await supabase.storage
        .from('assets')
        .createSignedUrl(filePath, 3600); // 1 hour expiry
      
      if (error) throw error;
      signedUrl = data.signedUrl;
    }

    // Save asset metadata to database
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .insert({
        user_id: user.user.id,
        organization_id: options.organizationId,
        project_id: options.projectId || null,
        filename: file.name,
        original_name: file.name,
        mime_type: file.type,
        file_size: file.size,
        s3_key: filePath,
        s3_bucket: 'assets',
        s3_region: 'auto', // Supabase handles this
        public_url: publicUrl || null,
        status: 'ready',
      })
      .select()
      .single();

    if (assetError) throw assetError;

    return {
      id: asset.id,
      path: filePath,
      publicUrl,
      signedUrl,
    };
  }

  // Get signed URL for private file
  static async getSignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
    const { data, error } = await supabase.storage
      .from('assets')
      .createSignedUrl(path, expiresIn);

    if (error) throw error;
    return data.signedUrl;
  }

  // Delete file
  static async deleteFile(path: string): Promise<void> {
    const { error } = await supabase.storage
      .from('assets')
      .remove([path]);

    if (error) throw error;

    // Remove from database
    await supabase
      .from('assets')
      .delete()
      .eq('s3_key', path);
  }

  // List files in organization folder
  static async listFiles(organizationId: string, folder?: string): Promise<any[]> {
    const basePath = `organizations/${organizationId}`;
    const searchPath = folder ? `${basePath}/${folder}` : basePath;

    const { data, error } = await supabase.storage
      .from('assets')
      .list(searchPath);

    if (error) throw error;
    return data || [];
  }

  // Generate upload URL for direct uploads
  static async createUploadUrl(organizationId: string, fileName: string, folder?: string) {
    const timestamp = Date.now();
    const basePath = `organizations/${organizationId}`;
    const folderPath = folder || 'assets';
    const filePath = `${basePath}/${folderPath}/${timestamp}-${fileName}`;

    // Create signed upload URL
    const { data, error } = await supabase.storage
      .from('assets')
      .createSignedUploadUrl(filePath);

    if (error) throw error;

    return {
      uploadUrl: data.signedUrl,
      path: filePath,
      token: data.token,
    };
  }

  // Process uploaded file (for direct uploads)
  static async processUpload(
    organizationId: string, 
    filePath: string, 
    fileData: {
      name: string;
      size: number;
      type: string;
    },
    options: {
      projectId?: string;
      metadata?: Record<string, any>;
    } = {}
  ) {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    // Verify file exists
    const { data: fileInfo, error: fileError } = await supabase.storage
      .from('assets')
      .list(filePath.substring(0, filePath.lastIndexOf('/')), {
        search: filePath.substring(filePath.lastIndexOf('/') + 1)
      });

    if (fileError || !fileInfo || fileInfo.length === 0) {
      throw new Error('File not found');
    }

    // Get public URL if bucket is public
    const { data } = supabase.storage
      .from('assets')
      .getPublicUrl(filePath);

    // Save asset metadata to database
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .insert({
        user_id: user.user.id,
        organization_id: organizationId,
        project_id: options.projectId || null,
        filename: fileData.name,
        original_name: fileData.name,
        mime_type: fileData.type,
        file_size: fileData.size,
        s3_key: filePath,
        s3_bucket: 'assets',
        s3_region: 'auto',
        public_url: data.publicUrl,
        status: 'ready',
        ai_config: options.metadata,
      })
      .select()
      .single();

    if (assetError) throw assetError;

    return {
      id: asset.id,
      path: filePath,
      publicUrl: data.publicUrl,
    };
  }

  // Get usage statistics
  static async getStorageStats(organizationId: string) {
    const { data: assets, error } = await supabase
      .from('assets')
      .select('file_size, mime_type')
      .eq('organization_id', organizationId);

    if (error) throw error;

    const totalSize = assets.reduce((sum, asset) => sum + asset.file_size, 0);
    const fileTypes = assets.reduce((acc, asset) => {
      const type = asset.mime_type.split('/')[0];
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalFiles: assets.length,
      totalSize,
      fileTypes,
    };
  }
}