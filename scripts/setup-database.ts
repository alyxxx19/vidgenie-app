import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setupDatabase() {
  console.log('🚀 Setting up database configuration...\n');

  try {
    // 1. Create default plans if they don't exist
    console.log('📦 Creating subscription plans...');
    
    const plans = [
      {
        id: 'free',
        name: 'free',
        description: 'Plan gratuit pour découvrir Vidgenie',
        price: 0,
        currency: 'EUR',
        creditsPerMonth: 100,
        maxGenerationsDay: 3,
        maxStorageGB: 1,
        features: ['basic_generation', 'standard_quality', 'community_support'],
      },
      {
        id: 'starter',
        name: 'starter',
        description: 'Idéal pour les créateurs individuels',
        price: 1900, // 19€ in cents
        currency: 'EUR',
        creditsPerMonth: 1000,
        maxGenerationsDay: 20,
        maxStorageGB: 10,
        features: ['hd_generation', 'no_watermark', 'email_support', 'all_templates'],
        stripePriceId: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID || null,
      },
      {
        id: 'pro',
        name: 'pro',
        description: 'Pour les professionnels et entreprises',
        price: 4900, // 49€ in cents
        currency: 'EUR',
        creditsPerMonth: 5000,
        maxGenerationsDay: 100,
        maxStorageGB: 100,
        features: ['4k_generation', 'priority_support', 'api_access', 'custom_branding', 'premium_templates'],
        stripePriceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || null,
      },
      {
        id: 'enterprise',
        name: 'enterprise',
        description: 'Pour les équipes et organisations',
        price: 9900, // 99€ in cents
        currency: 'EUR',
        creditsPerMonth: 15000,
        maxGenerationsDay: 500,
        maxStorageGB: 500,
        features: ['custom_solutions', 'dedicated_support', 'sla_guarantee', 'white_label', 'team_management'],
        stripePriceId: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || null,
      },
    ];

    for (const plan of plans) {
      try {
        await prisma.plan.upsert({
          where: { name: plan.name },
          update: plan,
          create: plan,
        });
        console.log(`  ✅ Plan "${plan.name}" created/updated`);
      } catch (err: any) {
        console.log(`  ⚠️  Plan "${plan.name}": ${err.message}`);
      }
    }

    // 2. Create sample prompts/templates
    console.log('\n📝 Creating prompt templates...');
    
    const templates = [
      {
        title: 'Vidéo Motivationnelle',
        content: 'Créez une vidéo inspirante de 30 secondes sur [sujet], avec une musique énergique et des transitions dynamiques. Style moderne et coloré.',
        category: 'motivation',
        tags: ['motivation', 'inspiration', 'court'],
        isTemplate: true,
        isPublic: true,
      },
      {
        title: 'Tutoriel Produit',
        content: 'Générez une vidéo tutoriel de 60 secondes montrant comment utiliser [produit]. Instructions claires, étapes numérotées, fond neutre.',
        category: 'tutorial',
        tags: ['tutoriel', 'produit', 'éducatif'],
        isTemplate: true,
        isPublic: true,
      },
      {
        title: 'Annonce Réseaux Sociaux',
        content: 'Vidéo publicitaire de 15 secondes pour [produit/service]. Accrocheur, call-to-action clair, optimisé pour mobile.',
        category: 'marketing',
        tags: ['publicité', 'social', 'court'],
        isTemplate: true,
        isPublic: true,
      },
      {
        title: 'Story Instagram',
        content: 'Story verticale de 10 secondes avec texte animé sur [message]. Format 9:16, couleurs vives, emojis inclus.',
        category: 'social',
        tags: ['instagram', 'story', 'vertical'],
        isTemplate: true,
        isPublic: true,
      },
      {
        title: 'Présentation Entreprise',
        content: 'Vidéo corporate de 90 secondes présentant [entreprise]. Professionnel, voix-off incluse, logo en intro/outro.',
        category: 'corporate',
        tags: ['entreprise', 'présentation', 'professionnel'],
        isTemplate: true,
        isPublic: true,
      },
    ];

    for (const template of templates) {
      try {
        const existing = await prisma.prompt.findFirst({
          where: { 
            title: template.title,
            isTemplate: true 
          }
        });

        if (!existing) {
          await prisma.prompt.create({
            data: template,
          });
          console.log(`  ✅ Template "${template.title}" created`);
        } else {
          console.log(`  ⏭️  Template "${template.title}" already exists`);
        }
      } catch (err: any) {
        console.log(`  ⚠️  Template error: ${err.message}`);
      }
    }

    // 3. Check and report database status
    console.log('\n📊 Database Status:');
    
    const userCount = await prisma.user.count();
    const planCount = await prisma.plan.count();
    const templateCount = await prisma.prompt.count({ where: { isTemplate: true } });
    const jobCount = await prisma.job.count();
    const assetCount = await prisma.asset.count();

    console.log(`  👥 Users: ${userCount}`);
    console.log(`  📦 Plans: ${planCount}`);
    console.log(`  📝 Templates: ${templateCount}`);
    console.log(`  ⚙️  Jobs: ${jobCount}`);
    console.log(`  🎬 Assets: ${assetCount}`);

    console.log('\n✅ Database setup completed!');
    
    // 4. Create indexes for better performance
    console.log('\n🔍 Note: For optimal performance, apply the following in Supabase SQL Editor:');
    console.log('   - CREATE INDEX idx_jobs_status ON jobs(status);');
    console.log('   - CREATE INDEX idx_assets_user_status ON assets("userId", status);');
    console.log('   - CREATE INDEX idx_posts_scheduled ON posts("scheduledAt");');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run setup
setupDatabase();