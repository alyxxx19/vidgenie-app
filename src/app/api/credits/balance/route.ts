import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCreditsManager } from '@/lib/services/credits-manager';
import { db } from '@/server/api/db';

export async function GET(request: NextRequest) {
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

    const creditsManager = getCreditsManager(db);
    const balanceInfo = await creditsManager.getBalance(user.id);

    return NextResponse.json({
      success: true,
      ...balanceInfo,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('[CREDITS-BALANCE-API] Error:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}