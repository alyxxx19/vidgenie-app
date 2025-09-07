import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/api/db';
import { secureLog } from '@/lib/secure-logger';

export async function POST(request: NextRequest) {
  // ✅ CORRECTION CRITIQUE - Bloquer en production
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Endpoint not available' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { email, name } = body;

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      );
    }

    // Find or create user
    let user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await db.user.create({
        data: {
          email,
          name,
          creatorType: 'solo',
          platforms: ['tiktok'],
          creditsBalance: 1000, // Dev credits
        },
      });

      // Log signup event
      await db.usageEvent.create({
        data: {
          userId: user.id,
          event: 'signup_completed',
          metadata: { 
            creatorType: user.creatorType,
            source: 'dev_login' 
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        creditsBalance: user.creditsBalance,
      },
    });
  } catch (error) {
    // ✅ Logger sécurisé implémenté
    secureLog.error('Dev login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}