import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/api/db';
import { z } from 'zod';
import { secureLog } from '@/lib/secure-logger';

// ✅ Schema validation stricte
const createUserSchema = z.object({
  id: z.string().cuid(),
  email: z.string().email(),
  name: z.string().min(1).max(100).optional(),
  source: z.enum(['signup', 'oauth']).optional()
});

export async function POST(request: NextRequest) {
  try {
    // ✅ Validation des données
    const body = await request.json();
    const validData = createUserSchema.parse(body);
    
    // ✅ Vérification de duplication
    const existingUser = await db.user.findUnique({
      where: { email: validData.email }
    });
    
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }
    
    // ✅ Validation ID unique aussi
    const existingUserById = await db.user.findUnique({
      where: { id: validData.id }
    });
    
    if (existingUserById) {
      return NextResponse.json({ error: 'User ID already exists' }, { status: 409 });
    }

    // ✅ Create user with validated data
    const user = await db.user.create({
      data: {
        id: validData.id,
        email: validData.email,
        name: validData.name || validData.email.split('@')[0],
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
    // ✅ Gestion d'erreur appropriée avec validation
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: error.issues 
      }, { status: 400 });
    }
    
    // ✅ Logger sécurisé implémenté
    secureLog.error('Create user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}