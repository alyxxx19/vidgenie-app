import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCreditsManager, CREDIT_COSTS } from '@/lib/services/credits-manager';
import { db } from '@/server/api/db';
import { secureLog } from '@/lib/secure-logger';

export async function POST(request: NextRequest) {
  try {
    // Authentifier l'utilisateur
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { operation, additionalCost = 0 } = body;

    if (!operation || !CREDIT_COSTS[operation as keyof typeof CREDIT_COSTS]) {
      return NextResponse.json(
        { error: 'Invalid operation type' },
        { status: 400 }
      );
    }

    const creditsManager = getCreditsManager(db);
    const result = await creditsManager.checkCredits(user.id, operation, additionalCost);

    return NextResponse.json({
      success: true,
      ...result,
      operation,
      cost: CREDIT_COSTS[operation as keyof typeof CREDIT_COSTS] + additionalCost,
    });

  } catch (error: any) {
    secureLog.error('[CREDITS-CHECK-API] Error:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// GET pour obtenir tous les coûts disponibles
export async function GET() {
  return NextResponse.json({
    success: true,
    costs: CREDIT_COSTS,
    operations: Object.keys(CREDIT_COSTS),
  });
}