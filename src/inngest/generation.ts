import { inngest } from '@/lib/inngest';
import { db } from '@/server/api/db';
import { uploadToS3, generateAssetKey } from '@/lib/s3';

// Mock AI providers with different characteristics
const AI_PROVIDERS = {
  'openai-sora': {
    name: 'OpenAI Sora',
    avgTime: 120, // seconds
    costPerSecond: 0.5,
    qualityScore: 9,
  },
  'midjourney': {
    name: 'MidJourney Video',
    avgTime: 180,
    costPerSecond: 0.3,
    qualityScore: 8,
  },
  'runwayml': {
    name: 'RunwayML Gen-3',
    avgTime: 90,
    costPerSecond: 0.4,
    qualityScore: 7,
  },
};

type AIProvider = keyof typeof AI_PROVIDERS;

// Select best provider based on prompt and duration
function selectOptimalProvider(prompt: string, duration: number): AIProvider {
  // Simple heuristic: longer videos prefer faster providers
  if (duration > 45) return 'runwayml';
  if (prompt.toLowerCase().includes('quality') || prompt.toLowerCase().includes('professional')) {
    return 'openai-sora';
  }
  return 'midjourney';
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

function generateMockVideoContent(prompt: string, duration: number): string {
  // Generate realistic mock video content metadata
  const timestamp = Date.now();
  const mockMetadata = {
    format: 'mp4',
    codec: 'h264',
    bitrate: '2000kbps',
    fps: 30,
    resolution: '1080x1920',
    duration: `${duration}s`,
    prompt: prompt.slice(0, 100),
    generated_at: new Date().toISOString(),
    mock_content_id: `vid_${timestamp}`,
  };
  
  // In a real implementation, this would be actual video binary data
  return JSON.stringify(mockMetadata, null, 2);
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
      const config = job.config as { duration?: number; platforms?: string[] };
      const selectedProvider = selectOptimalProvider(
        job.prompt || '',
        config?.duration || 30
      );
      
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

    // Simulate AI generation with realistic progress updates
    const generatedContent = await step.run('generate-content', async () => {
      const selectedAI = AI_PROVIDERS[provider];
      const config = job.config as { duration?: number; platforms?: string[] };
      const duration = config?.duration || 30;
      const simulationTime = selectedAI.avgTime * 1000; // Convert to ms
      const progressSteps = 8;
      const stepTime = simulationTime / progressSteps;
      
      // Simulate generation steps with progress updates
      for (let i = 0; i < progressSteps; i++) {
        await new Promise(resolve => setTimeout(resolve, stepTime));
        const progress = 20 + ((i + 1) / progressSteps) * 60; // 20-80%
        const remaining = Math.floor((progressSteps - i - 1) * stepTime / 1000);
        
        await db.job.update({
          where: { id: jobId },
          data: {
            progress: Math.floor(progress),
            estimatedTimeRemaining: remaining,
          },
        });
      }
      
      // Generate realistic mock video content
      const mockVideoContent = generateMockVideoContent(job.prompt || '', duration);
      
      return {
        buffer: Buffer.from(mockVideoContent),
        filename: `generated-${Date.now()}-${provider}.mp4`,
        mimeType: 'video/mp4' as const,
        duration,
        width: 1080,
        height: 1920,
        provider,
        qualityScore: selectedAI.qualityScore,
        generationCost: selectedAI.costPerSecond * duration,
      };
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
        Buffer.isBuffer(generatedContent.buffer) ? generatedContent.buffer : Buffer.from(JSON.stringify(generatedContent.buffer)),
        generatedContent.mimeType
      );

      return await db.asset.create({
        data: {
          userId: job.userId,
          projectId: job.projectId,
          jobId: job.id,
          filename: generatedContent.filename,
          mimeType: generatedContent.mimeType,
          fileSize: Buffer.isBuffer(generatedContent.buffer) ? generatedContent.buffer.length : JSON.stringify(generatedContent.buffer).length,
          duration: generatedContent.duration,
          width: generatedContent.width,
          height: generatedContent.height,
          s3Key,
          s3Bucket: process.env.S3_BUCKET_NAME || 'vidgenie-media',
          s3Region: process.env.S3_REGION || 'eu-west-3',
          publicUrl,
          generatedBy: generatedContent.provider,
          prompt: job.prompt,
          status: 'ready',
          aiConfig: {
            ...(job.config as Record<string, unknown>),
            seoData,
            qualityScore: generatedContent.qualityScore,
            generationCost: generatedContent.generationCost,
            provider: AI_PROVIDERS[generatedContent.provider as AIProvider].name,
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