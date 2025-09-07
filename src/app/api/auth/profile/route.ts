import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { db } from '@/server/api/db';
import { secureLog } from '@/lib/secure-logger';

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const token = authorization.replace('Bearer ', '');
    
    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user from our database
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      // include: { plan: true }, // TODO: Add plan relation to schema
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name || 'User',
      creditsBalance: dbUser.creditsBalance,
      planId: dbUser.planId,
    });
  } catch (error) {
    secureLog.error('Profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}