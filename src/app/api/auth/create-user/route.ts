import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/api/db';

export async function POST(request: NextRequest) {
  try {
    const { id, email, name } = await request.json();

    if (!id || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create user in our database
    const user = await db.user.create({
      data: {
        id,
        email,
        name: name || email.split('@')[0],
        creditsBalance: 100, // Free credits on signup
        planId: 'free',
        creatorType: 'solo',
        platforms: ['tiktok'],
      },
    });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name || 'User',
      creditsBalance: user.creditsBalance,
      planId: user.planId,
    });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}