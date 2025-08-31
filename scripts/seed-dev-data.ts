import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  console.log('🌱 Creating comprehensive dev data...');

  // Get or create test user
  const testUser = await db.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User',
      creatorType: 'solo',
      platforms: ['tiktok', 'youtube', 'instagram'],
      creditsBalance: 1000,
      planId: 'pro',
    },
  });

  console.log(`✅ Test user: ${testUser.email}`);

  // Create test project
  const project = await db.project.upsert({
    where: { id: 'test-project-1' },
    update: {},
    create: {
      id: 'test-project-1',
      userId: testUser.id,
      name: 'Mon Premier Projet',
      description: 'Contenu de test pour le développement',
      isDefault: true,
    },
  });

  // Create test assets
  const assets = [
    {
      id: 'test-asset-1',
      filename: 'viral-morning-routine.mp4',
      originalName: 'morning-routine-original.mp4',
      mimeType: 'video/mp4',
      fileSize: 15728640,
      duration: 30,
      width: 1080,
      height: 1920,
      s3Key: 'test/user-1/viral-morning-routine.mp4',
      s3Bucket: 'vidgenie-test',
      s3Region: 'eu-west-3',
      publicUrl: '/test-video-1.mp4',
      thumbnail: '/test-thumb-1.jpg',
      generatedBy: 'openai',
      prompt: 'Routine matinale productive et motivante',
      status: 'ready',
      aiConfig: {
        seoData: {
          title: 'Routine Matinale Qui Va Changer Votre Vie',
          keywords: ['routine', 'matinale', 'productivité', 'motivation'],
          hashtags: {
            tiktok: ['#fyp', '#routine', '#motivation', '#productivity'],
            youtube: ['#shorts', '#morningroutine', '#productivity'],
            instagram: ['#reels', '#morning', '#lifestyle', '#motivation'],
          },
          descriptions: {
            tiktok: 'Cette routine matinale va transformer vos journées 🌅 #fyp #routine',
            youtube: 'Découvrez la routine matinale des entrepreneurs à succès | Abonnez-vous !',
            instagram: 'Morning routine for success ✨ #reels #morning #lifestyle',
          },
        },
        provider: 'OpenAI Sora',
        qualityScore: 9.2,
        generationCost: 10,
      },
    },
    {
      id: 'test-asset-2',
      filename: 'tech-tips-shortcuts.mp4',
      originalName: 'tech-shortcuts-original.mp4',
      mimeType: 'video/mp4',
      fileSize: 25165824,
      duration: 45,
      width: 1080,
      height: 1920,
      s3Key: 'test/user-1/tech-tips-shortcuts.mp4',
      s3Bucket: 'vidgenie-test',
      s3Region: 'eu-west-3',
      publicUrl: '/test-video-2.mp4',
      thumbnail: '/test-thumb-2.jpg',
      generatedBy: 'openai',
      prompt: 'Astuces tech pour gagner du temps au travail',
      status: 'ready',
      aiConfig: {
        seoData: {
          title: 'Les Raccourcis Tech Que Personne Ne Connaît',
          keywords: ['tech', 'productivity', 'shortcuts', 'tips'],
          hashtags: {
            tiktok: ['#techtips', '#productivity', '#shortcuts', '#tech'],
            youtube: ['#productivity', '#techtips', '#shortcuts'],
            instagram: ['#tech', '#productivity', '#tips', '#work'],
          },
          descriptions: {
            tiktok: 'Ces raccourcis tech vont vous faire gagner 2h par jour 💻 #techtips',
            youtube: 'Top 10 des raccourcis tech pour booster votre productivité',
            instagram: 'Tech hacks for productivity 🚀 #tech #productivity',
          },
        },
        provider: 'OpenAI Sora',
        qualityScore: 8.7,
        generationCost: 10,
      },
    },
  ];

  for (const assetData of assets) {
    await db.asset.upsert({
      where: { id: assetData.id },
      update: {},
      create: {
        ...assetData,
        userId: testUser.id,
        projectId: project.id,
      },
    });
  }

  // Create test jobs
  const jobs = [
    {
      id: 'test-job-1',
      type: 'generation',
      status: 'completed',
      prompt: 'Routine matinale productive et motivante',
      config: { duration: 30, platforms: ['tiktok'] },
      estimatedTime: 300,
      actualTime: 280,
      progress: 100,
      resultAssetId: 'test-asset-1',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 1000),
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 300000),
    },
    {
      id: 'test-job-2',
      type: 'generation',
      status: 'completed',
      prompt: 'Astuces tech pour gagner du temps au travail',
      config: { duration: 45, platforms: ['youtube', 'tiktok'] },
      estimatedTime: 450,
      actualTime: 420,
      progress: 100,
      resultAssetId: 'test-asset-2',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      startedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 1000),
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 450000),
    },
    {
      id: 'test-job-3',
      type: 'generation',
      status: 'running',
      prompt: 'Contenu motivation pour entrepreneurs',
      config: { duration: 35, platforms: ['instagram', 'tiktok'] },
      estimatedTime: 350,
      actualTime: null,
      progress: 65,
      resultAssetId: null,
      createdAt: new Date(Date.now() - 30 * 60 * 1000),
      startedAt: new Date(Date.now() - 25 * 60 * 1000),
      completedAt: null,
    },
  ];

  for (const jobData of jobs) {
    await db.job.upsert({
      where: { id: jobData.id },
      update: {},
      create: {
        ...jobData,
        userId: testUser.id,
        projectId: project.id,
      },
    });
  }

  // Create test posts
  const posts = [
    {
      id: 'test-post-1',
      assetId: 'test-asset-1',
      title: 'Morning Routine Viral',
      description: 'Cette routine matinale va transformer vos journées 🌅',
      hashtags: ['#routine', '#motivation', '#productivity', '#fyp'],
      platforms: ['tiktok'],
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: 'scheduled',
      seoOptimized: true,
    },
    {
      id: 'test-post-2',
      assetId: 'test-asset-2',
      title: 'Tech Tips Published',
      description: 'Les meilleurs raccourcis tech pour booster votre productivité',
      hashtags: ['#techtips', '#productivity', '#shortcuts'],
      platforms: ['youtube', 'tiktok'],
      scheduledAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      publishedAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
      status: 'published',
      seoOptimized: true,
      platformData: {
        youtube: {
          id: 'yt_123456789',
          url: 'https://youtube.com/shorts/yt_123456789',
        },
        tiktok: {
          id: 'tt_987654321',
          url: 'https://tiktok.com/@user/video/tt_987654321',
        },
      },
    },
  ];

  for (const postData of posts) {
    await db.post.upsert({
      where: { id: postData.id },
      update: {},
      create: {
        ...postData,
        userId: testUser.id,
        projectId: project.id,
      },
    });
  }

  // Create credit transactions
  const transactions = [
    {
      userId: testUser.id,
      amount: 1000,
      type: 'purchase',
      description: 'Purchase of Pro plan',
      costEur: 49.0,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
    {
      userId: testUser.id,
      amount: -10,
      type: 'generation',
      description: 'Content generation: Routine matinale productive',
      jobId: 'test-job-1',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      userId: testUser.id,
      amount: -10,
      type: 'generation',
      description: 'Content generation: Astuces tech pour productivité',
      jobId: 'test-job-2',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      userId: testUser.id,
      amount: -5,
      type: 'publishing',
      description: 'Content publishing to TikTok + YouTube',
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    },
  ];

  for (const tx of transactions) {
    await db.creditLedger.create({ data: tx });
  }

  // Create usage events
  const usageEvents = [
    {
      userId: testUser.id,
      jobId: 'test-job-1',
      event: 'generation_started',
      duration: 280,
      metadata: { prompt: 'Routine matinale productive' },
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      userId: testUser.id,
      jobId: 'test-job-1',
      event: 'generation_succeeded',
      duration: 280,
      metadata: { prompt: 'Routine matinale productive' },
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 280000),
    },
    {
      userId: testUser.id,
      jobId: 'test-job-2',
      event: 'generation_started',
      duration: 420,
      metadata: { prompt: 'Astuces tech pour productivité' },
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      userId: testUser.id,
      jobId: 'test-job-2',
      event: 'generation_succeeded',
      duration: 420,
      metadata: { prompt: 'Astuces tech pour productivité' },
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 420000),
    },
    {
      userId: testUser.id,
      event: 'publishing_succeeded',
      platform: 'tiktok',
      duration: 15,
      metadata: { postId: 'test-post-2' },
      createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
    },
  ];

  for (const event of usageEvents) {
    await db.usageEvent.create({ data: event });
  }

  console.log('✅ Dev data created successfully!');
  console.log(`- Assets: ${assets.length}`);
  console.log(`- Jobs: ${jobs.length}`);
  console.log(`- Posts: ${posts.length}`);
  console.log(`- Transactions: ${transactions.length}`);
  console.log(`- Usage events: ${usageEvents.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Dev data creation failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });