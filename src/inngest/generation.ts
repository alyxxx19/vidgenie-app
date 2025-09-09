import { inngest } from '@/lib/inngest';
import { db } from '@/server/api/db';
import { uploadToS3, generateAssetKey } from '@/lib/s3';
import Replicate from 'replicate';

// Import the new generation workers
export {
  generateImageWorker,
  generateVideoWorker,
  imageToVideoWorkflowWorker,
  cleanupWorker,
  monitorJobsWorker,
  scheduleCleanup,
  scheduleMonitoring,
} from './generation-workers';

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || '',
});

// Real AI providers available on Replicate
const AI_PROVIDERS = {
  'minimax-video': {
    name: 'Minimax Video-01',
    model: 'minimax/video-01',
    avgTime: 180, // seconds
    costPerSecond: 0.08,
    qualityScore: 9,
    maxDuration: 6,
  },
  'stable-video-diffusion': {
    name: 'Stable Video Diffusion',
    model: 'stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438',
    avgTime: 120,
    costPerSecond: 0.05,
    qualityScore: 7,
    maxDuration: 4,
  },
  'hunyuan-video': {
    name: 'HunyuanVideo',
    model: 'tencent/hunyuan-video',
    avgTime: 200,
    costPerSecond: 0.06,
    qualityScore: 8,
    maxDuration: 5,
  },
};

type AIProvider = keyof typeof AI_PROVIDERS;

// Select best provider based on prompt and duration
function selectOptimalProvider(prompt: string, duration: number): AIProvider {
  // Choose based on duration limits and quality requirements
  if (duration <= 4) {
    // SVD for shorter clips
    return 'stable-video-diffusion';
  }
  if (duration <= 5 && (prompt.toLowerCase().includes('quality') || prompt.toLowerCase().includes('professional'))) {
    // HunyuanVideo for high quality 5s clips
    return 'hunyuan-video';
  }
  if (duration <= 6) {
    // Minimax for longer clips up to 6s
    return 'minimax-video';
  }
  // Default to SVD and trim duration
  return 'stable-video-diffusion';
}

// Generate SEO-optimized content metadata
function generateSEOMetadata(prompt: string, platforms: string[]) {
  const keywords = extractKeywords(prompt);
  const hashtags = generateHashtags(keywords, platforms);
  const descriptions = generateDescriptions(prompt, platforms);
  
  return {
    keywords,
    hashtags,
    descriptions,
    title: generateTitle(prompt),
  };
}

function extractKeywords(prompt: string): string[] {
  // Simple keyword extraction - in real app, use NLP
  const words = prompt.toLowerCase().split(/\s+/);
  const stopWords = ['le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'et', 'ou', 'avec', 'pour', 'sur'];
  return words
    .filter(word => word.length > 3 && !stopWords.includes(word))
    .slice(0, 10);
}

function generateHashtags(keywords: string[], platforms: string[]): Record<string, string[]> {
  const baseHashtags = keywords.map(k => `#${k}`);
  const result: Record<string, string[]> = {};
  
  platforms.forEach(platform => {
    const platformHashtags = [...baseHashtags];
    
    switch (platform) {
      case 'tiktok':
        platformHashtags.push('#tiktokviral', '#fyp', '#trending');
        break;
      case 'youtube':
        platformHashtags.push('#youtubeshorts', '#viral', '#trending');
        break;
      case 'instagram':
        platformHashtags.push('#reels', '#reelsinstagram', '#viral');
        break;
    }
    
    result[platform] = platformHashtags.slice(0, 15); // Platform limits
  });
  
  return result;
}

function generateDescriptions(prompt: string, platforms: string[]): Record<string, string> {
  const baseDescription = `Contenu créé automatiquement avec l'IA. ${prompt.slice(0, 100)}...`;
  const result: Record<string, string> = {};
  
  platforms.forEach(platform => {
    switch (platform) {
      case 'tiktok':
        result[platform] = `${baseDescription} #TikTokMadeMe #FYP`;
        break;
      case 'youtube':
        result[platform] = `${baseDescription} Abonnez-vous pour plus de contenu !`;
        break;
      case 'instagram':
        result[platform] = `${baseDescription} 📱✨ #Reels`;
        break;
      default:
        result[platform] = baseDescription;
    }
  });
  
  return result;
}

function generateTitle(prompt: string): string {
  // Extract main theme from prompt
  const words = prompt.split(' ');
  return words.slice(0, 8).join(' ').replace(/[^\w\s]/g, '');
}

// Generate video using Replicate API
async function generateVideoWithReplicate(
  prompt: string, 
  duration: number, 
  provider: AIProvider
): Promise<{
  videoUrl: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
  actualDuration: number;
  provider: string;
  qualityScore: number;
  generationCost: number;
}> {
  const selectedProvider = AI_PROVIDERS[provider];
  const clampedDuration = Math.min(duration, selectedProvider.maxDuration);
  
  let input: Record<string, any>;
  
  switch (provider) {
    case 'minimax-video':
      input = {
        prompt: prompt,
        duration: clampedDuration,
        aspect_ratio: '9:16', // TikTok format
      };
      break;
      
    case 'stable-video-diffusion':
      input = {
        input_image: null, // Text-to-video mode
        prompt: prompt,
        num_frames: Math.min(25, clampedDuration * 6), // ~6 fps
        motion_bucket_id: 127,
        cond_aug: 0.02,
      };
      break;
      
    case 'hunyuan-video':
      input = {
        prompt: prompt,
        duration: clampedDuration,
        resolution: "720p",
        aspect_ratio: "9:16",
        seed: Math.floor(Math.random() * 1000000),
      };
      break;
      
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }

  // Run the prediction
  const prediction = await replicate.run(selectedProvider.model as `${string}/${string}` | `${string}/${string}:${string}`, { input });
  
  // Handle different response formats
  let videoUrl: string;
  let thumbnailUrl: string | undefined;
  
  if (Array.isArray(prediction)) {
    videoUrl = prediction[0] as string;
  } else if (typeof prediction === 'string') {
    videoUrl = prediction;
  } else if (prediction && typeof prediction === 'object' && 'video' in prediction) {
    videoUrl = (prediction as any).video;
    thumbnailUrl = (prediction as any).thumbnail;
  } else {
    throw new Error('Unexpected prediction format from Replicate');
  }

  return {
    videoUrl,
    thumbnailUrl,
    width: 720,
    height: 1280, // 9:16 aspect ratio
    actualDuration: clampedDuration,
    provider: selectedProvider.name,
    qualityScore: selectedProvider.qualityScore,
    generationCost: selectedProvider.costPerSecond * clampedDuration,
  };
}

export const generationWorker = inngest.createFunction(
  { 
    id: 'content-generation',
    name: 'Generate Content with AI',
    retries: 3,
  },
  { event: 'generation/start' },
  async ({ event, step }) => {
    const { jobId } = event.data;

    // Get job details
    const job = await step.run('fetch-job', async () => {
      return await db.job.findUnique({
        where: { id: jobId },
        include: { user: true },
      });
    });

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    // Update job status
    await step.run('update-job-running', async () => {
      await db.job.update({
        where: { id: jobId },
        data: { 
          status: 'running',
          startedAt: new Date(),
        },
      });
    });

    // Select optimal AI provider
    const provider = await step.run('select-provider', async () => {
      const config = job.config as { duration?: number; platforms?: string[]; style?: string };
      let selectedProvider: AIProvider;
      
      // Use user-selected model if provided, otherwise auto-select
      if (config?.style && config.style in AI_PROVIDERS) {
        selectedProvider = config.style as AIProvider;
      } else {
        selectedProvider = selectOptimalProvider(
          job.prompt || '',
          config?.duration || 30
        );
      }
      
      // Update job with provider info
      await db.job.update({
        where: { id: jobId },
        data: {
          progress: 10,
          estimatedTimeRemaining: AI_PROVIDERS[selectedProvider].avgTime,
          metadata: {
            ...job.metadata as any,
            aiProvider: selectedProvider,
            providerName: AI_PROVIDERS[selectedProvider].name,
          },
        },
      });
      
      return selectedProvider;
    });

    // Generate SEO metadata
    const seoData = await step.run('generate-seo', async () => {
      await db.job.update({
        where: { id: jobId },
        data: { progress: 20 },
      });
      
      const config = job.config as { duration?: number; platforms?: string[] };
      return generateSEOMetadata(
        job.prompt || '',
        config?.platforms || ['tiktok']
      );
    });

    // Generate video with real AI API
    const generatedContent = await step.run('generate-content', async () => {
      const config = job.config as { duration?: number; platforms?: string[] };
      const duration = config?.duration || 30;
      
      // Update progress to 30%
      await db.job.update({
        where: { id: jobId },
        data: {
          progress: 30,
          estimatedTimeRemaining: AI_PROVIDERS[provider].avgTime,
        },
      });
      
      try {
        // Generate video using Replicate
        const result = await generateVideoWithReplicate(
          job.prompt || '',
          duration,
          provider
        );
        
        // Update progress to 70%
        await db.job.update({
          where: { id: jobId },
          data: { progress: 70 },
        });
        
        // Download video from Replicate URL
        const videoResponse = await fetch(result.videoUrl);
        if (!videoResponse.ok) {
          throw new Error(`Failed to download video: ${videoResponse.statusText}`);
        }
        
        const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
        
        // Download thumbnail if available
        let thumbnailBuffer: Buffer | undefined;
        if (result.thumbnailUrl) {
          const thumbnailResponse = await fetch(result.thumbnailUrl);
          if (thumbnailResponse.ok) {
            thumbnailBuffer = Buffer.from(await thumbnailResponse.arrayBuffer());
          }
        }
        
        return {
          buffer: videoBuffer,
          thumbnailBuffer,
          filename: `generated-${Date.now()}-${provider}.mp4`,
          thumbnailFilename: thumbnailBuffer ? `thumb-${Date.now()}-${provider}.jpg` : undefined,
          mimeType: 'video/mp4' as const,
          duration: result.actualDuration,
          width: result.width,
          height: result.height,
          provider: result.provider,
          qualityScore: result.qualityScore,
          generationCost: result.generationCost,
        };
      } catch (error) {
        // Mark job as failed
        await db.job.update({
          where: { id: jobId },
          data: {
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            completedAt: new Date(),
          },
        });
        throw error;
      }
    });

    // Update progress to 90% before upload
    await step.run('pre-upload-progress', async () => {
      await db.job.update({
        where: { id: jobId },
        data: { progress: 90 },
      });
    });

    // Upload to S3
    const asset = await step.run('upload-to-s3', async () => {
      const s3Key = generateAssetKey(job.userId, generatedContent.filename);
      const publicUrl = await uploadToS3(
        s3Key,
        Buffer.isBuffer(generatedContent.buffer) 
          ? generatedContent.buffer 
          : Buffer.from((generatedContent.buffer as any).data || generatedContent.buffer),
        generatedContent.mimeType
      );
      
      // Upload thumbnail if available
      let thumbnailUrl: string | undefined;
      let thumbnailS3Key: string | undefined;
      if (generatedContent.thumbnailBuffer && generatedContent.thumbnailFilename) {
        thumbnailS3Key = generateAssetKey(job.userId, generatedContent.thumbnailFilename);
        thumbnailUrl = await uploadToS3(
          thumbnailS3Key,
          Buffer.isBuffer(generatedContent.thumbnailBuffer) 
            ? generatedContent.thumbnailBuffer 
            : Buffer.from((generatedContent.thumbnailBuffer as any).data || generatedContent.thumbnailBuffer),
          'image/jpeg'
        );
      }

      return await db.asset.create({
        data: {
          userId: job.userId,
          projectId: job.projectId,
          jobId: job.id,
          filename: generatedContent.filename,
          mimeType: generatedContent.mimeType,
          fileSize: Buffer.isBuffer(generatedContent.buffer) 
            ? generatedContent.buffer.length 
            : (generatedContent.buffer as any).data?.length || 0,
          duration: generatedContent.duration,
          width: generatedContent.width,
          height: generatedContent.height,
          s3Key,
          s3Bucket: process.env.S3_BUCKET_NAME || 'vidgenie-media-dev',
          s3Region: process.env.S3_REGION || 'eu-west-3',
          publicUrl,
          thumbnailUrl,
          thumbnailS3Key,
          generatedBy: generatedContent.provider,
          prompt: job.prompt,
          status: 'ready',
          aiConfig: {
            ...(job.config as Record<string, unknown>),
            seoData,
            qualityScore: generatedContent.qualityScore,
            generationCost: generatedContent.generationCost,
            provider: generatedContent.provider,
          },
        },
      });
    });

    // Complete job
    await step.run('complete-job', async () => {
      const completedAt = new Date();
      const startTime = job.startedAt ? new Date(job.startedAt).getTime() : new Date(job.createdAt).getTime();
      const actualTime = Math.floor((completedAt.getTime() - startTime) / 1000);

      await db.job.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          completedAt,
          actualTime,
          resultAssetId: asset.id,
        },
      });

      // Log success event
      await db.usageEvent.create({
        data: {
          userId: job.userId,
          jobId: job.id,
          event: 'generation_succeeded',
          duration: actualTime,
          metadata: {
            assetId: asset.id,
            prompt: job.prompt,
            provider: generatedContent.provider as string,
            qualityScore: generatedContent.qualityScore as number,
            generationCost: generatedContent.generationCost as number,
            seoGenerated: true,
          },
        },
      });
    });

    return {
      success: true,
      assetId: asset.id,
      provider: generatedContent.provider,
      qualityScore: generatedContent.qualityScore,
      seoData,
    };
  }
);