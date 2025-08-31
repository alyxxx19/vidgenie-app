import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default plans
  console.log('Creating subscription plans...');
  
  const plans = [
    {
      id: 'free',
      name: 'Gratuit',
      description: 'Parfait pour commencer',
      price: 0,
      creditsPerMonth: 100,
      maxGenerationsDay: 3,
      maxStorageGB: 1,
      features: ['basic_ai'],
    },
    {
      id: 'starter',
      name: 'Starter',
      description: 'Pour les créateurs réguliers',
      price: 1900, // 19€
      creditsPerMonth: 500,
      maxGenerationsDay: 15,
      maxStorageGB: 5,
      features: ['basic_ai', 'scheduling', 'analytics'],
    },
    {
      id: 'pro',
      name: 'Pro',
      description: 'Pour les créateurs professionnels',
      price: 4900, // 49€
      creditsPerMonth: 1500,
      maxGenerationsDay: 50,
      maxStorageGB: 20,
      features: ['advanced_ai', 'scheduling', 'analytics', 'priority_support'],
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'Pour les équipes et agences',
      price: 9900, // 99€
      creditsPerMonth: 5000,
      maxGenerationsDay: 200,
      maxStorageGB: 100,
      features: ['advanced_ai', 'scheduling', 'analytics', 'priority_support', 'api_access', 'white_label'],
    },
  ];

  for (const plan of plans) {
    await db.plan.upsert({
      where: { name: plan.name },
      update: plan,
      create: plan,
    });
  }

  // Create template prompts
  console.log('Creating template prompts...');
  
  const templates = [
    {
      title: 'Vidéo Motivation Entrepreneuriat',
      content: 'Créez une vidéo inspirante sur l\'importance de poursuivre ses rêves d\'entrepreneur, avec des visuels dynamiques et une musique motivante. Incluez des citations inspirantes et des success stories.',
      category: 'motivation',
      tags: ['entrepreneuriat', 'motivation', 'business', 'inspiration'],
      isTemplate: true,
      isPublic: true,
      usageCount: 127,
    },
    {
      title: 'Tutoriel Productivité Express',
      content: 'Réalisez un tutoriel court et efficace sur une astuce de productivité. Format step-by-step avec des visuels clairs et des call-to-action engageants.',
      category: 'tutorial',
      tags: ['productivité', 'tutorial', 'tips', 'lifestyle'],
      isTemplate: true,
      isPublic: true,
      usageCount: 89,
    },
    {
      title: 'Présentation Produit Viral',
      content: 'Présentez un produit de manière engageante et virale. Mettez l\'accent sur les bénéfices utilisateur, utilisez des transitions dynamiques et des visuels accrocheurs.',
      category: 'product',
      tags: ['produit', 'marketing', 'viral', 'vente'],
      isTemplate: true,
      isPublic: true,
      usageCount: 156,
    },
    {
      title: 'Conseil Développement Personnel',
      content: 'Partagez un conseil de développement personnel actionnable. Utilisez des exemples concrets, des visuels apaisants et une narration bienveillante.',
      category: 'personal_development',
      tags: ['développement', 'personnel', 'conseil', 'mindset'],
      isTemplate: true,
      isPublic: true,
      usageCount: 203,
    },
    {
      title: 'Trend TikTok Original',
      content: 'Surfez sur une tendance TikTok populaire en y ajoutant votre twist original. Gardez le format viral tout en apportant votre valeur unique.',
      category: 'trend',
      tags: ['tiktok', 'trend', 'viral', 'original'],
      isTemplate: true,
      isPublic: true,
      usageCount: 78,
    },
  ];

  for (const template of templates) {
    // Check if template exists
    const existing = await db.prompt.findFirst({
      where: { 
        title: template.title,
        isTemplate: true,
        isPublic: true,
      },
    });

    if (!existing) {
      await db.prompt.create({
        data: {
          ...template,
          userId: null, // Public template
        },
      });
    }
  }

  // Create test user if in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Creating test user...');
    
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

    // Create some test prompts for the user
    const userPrompts = [
      {
        title: 'Ma vidéo de motivation préférée',
        content: 'Créez une vidéo motivante sur le dépassement de soi avec des images de sport extrême et une musique épique.',
        category: 'motivation',
        tags: ['sport', 'dépassement', 'motivation'],
        isPinned: true,
        usageCount: 5,
      },
      {
        title: 'Astuce marketing digital',
        content: 'Partagez une astuce marketing digital peu connue mais très efficace. Format court et actionnable.',
        category: 'marketing',
        tags: ['marketing', 'digital', 'astuce', 'business'],
        usageCount: 3,
      },
    ];

    for (const prompt of userPrompts) {
      await db.prompt.create({
        data: {
          ...prompt,
          userId: testUser.id,
        },
      });
    }

    // Create test project
    const project = await db.project.create({
      data: {
        userId: testUser.id,
        name: 'Mon Premier Projet',
        description: 'Contenu de test pour le développement',
        isDefault: true,
      },
    });

    // Create some test jobs and assets
    console.log('Creating test content...');
    
    const testJobs = [
      {
        prompt: 'Vidéo motivante sur l\'entrepreneuriat avec des visuels inspirants',
        status: 'completed',
        duration: 30,
        platforms: ['tiktok', 'youtube'],
      },
      {
        prompt: 'Tutoriel rapide sur la gestion du temps',
        status: 'completed', 
        duration: 45,
        platforms: ['instagram', 'tiktok'],
      },
      {
        prompt: 'Présentation d\'un produit tech innovant',
        status: 'running',
        duration: 60,
        platforms: ['youtube', 'instagram'],
      },
    ];

    for (let i = 0; i < testJobs.length; i++) {
      const jobData = testJobs[i];
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - i * 2); // Spread over time

      const job = await db.job.create({
        data: {
          userId: testUser.id,
          projectId: project.id,
          type: 'generation',
          status: jobData!.status,
          prompt: jobData!.prompt,
          config: {
            duration: jobData!.duration,
            platforms: jobData!.platforms,
          },
          estimatedTime: jobData!.duration * 10,
          actualTime: jobData!.status === 'completed' ? jobData!.duration * 8 : null,
          createdAt,
          startedAt: jobData!.status !== 'pending' ? createdAt : null,
          completedAt: jobData!.status === 'completed' ? new Date(createdAt.getTime() + 5 * 60 * 1000) : null,
          progress: jobData!.status === 'completed' ? 100 : jobData!.status === 'running' ? 65 : 0,
        },
      });

      // Create asset for completed jobs
      if (jobData!.status === 'completed') {
        const asset = await db.asset.create({
          data: {
            userId: testUser.id,
            projectId: project.id,
            filename: `generated-${Date.now()}-${i}.mp4`,
            mimeType: 'video/mp4',
            fileSize: 1024 * 1024 * 5, // 5MB
            duration: jobData!.duration,
            width: 1080,
            height: 1920,
            s3Key: `test/user-${testUser.id}/generated-${Date.now()}-${i}.mp4`,
            s3Bucket: 'vidgenie-media-test',
            s3Region: 'eu-west-3',
            publicUrl: `https://example.com/test-video-${i}.mp4`,
            generatedBy: 'mock-ai',
            prompt: jobData!.prompt,
            status: 'ready',
            aiConfig: {
              seoData: {
                title: `Contenu généré ${i + 1}`,
                keywords: ['contenu', 'vidéo', 'création'],
                hashtags: {
                  tiktok: ['#fyp', '#viral', '#content'],
                  youtube: ['#shorts', '#viral', '#creator'],
                  instagram: ['#reels', '#viral', '#content'],
                },
                descriptions: {
                  tiktok: `${jobData!.prompt} 🚀 #fyp #viral`,
                  youtube: `${jobData!.prompt} | Abonnez-vous pour plus !`,
                  instagram: `${jobData!.prompt} ✨ #reels #viral`,
                },
              },
              provider: 'OpenAI Sora',
              qualityScore: 8 + Math.random() * 2,
              generationCost: 10,
            },
            createdAt,
          },
        });

        // Update job with result asset ID
        await db.job.update({
          where: { id: job.id },
          data: { resultAssetId: asset.id },
        });

        // Log usage events
        await db.usageEvent.create({
          data: {
            userId: testUser.id,
            jobId: job.id,
            event: 'generation_succeeded',
            duration: jobData!.duration * 8,
            metadata: {
              prompt: jobData!.prompt,
              platforms: jobData!.platforms,
            },
            createdAt,
          },
        });
      }

      // Log credit transactions
      await db.creditLedger.create({
        data: {
          userId: testUser.id,
          amount: -10,
          type: 'generation',
          description: `Content generation: ${jobData!.prompt.slice(0, 50)}...`,
          jobId: job.id,
          createdAt,
        },
      });
    }

    console.log(`✅ Created test user: ${testUser.email}`);
    console.log(`✅ Created ${testJobs.length} test jobs and assets`);
  }

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });