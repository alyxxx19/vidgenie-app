import { initTRPC, TRPCError } from '@trpc/server';
import { type CreateNextContextOptions } from '@trpc/server/adapters/next';
import { db } from './db';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/supabase/types';

interface CreateContextOptions {
  user: any;
  db: typeof db;
}

const createInnerTRPCContext = (opts: CreateContextOptions) => {
  return {
    user: opts.user,
    db: opts.db,
  };
};

export const createTRPCContext = async (_opts: CreateNextContextOptions) => {
  let user = null;
  
  try {
    // Create Supabase client for tRPC context
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );

    // Get authenticated user
    const { data: { user: authUser }, error } = await supabase.auth.getUser();
    
    if (!error && authUser) {
      // Get user profile from database
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      user = { ...authUser, profile };
    }

    // DEV MODE: Auto-authenticate for development if no user found
    if (process.env.NODE_ENV === 'development' && !user) {
      user = {
        id: 'dev-user-1',
        email: 'dev@vidgenie.com',
        profile: {
          id: 'dev-user-1',
          email: 'dev@vidgenie.com',
          name: 'Développeur',
          avatar: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          creator_type: 'solo',
          platforms: ['tiktok', 'youtube'],
          preferred_lang: 'fr',
          timezone: 'Europe/Paris',
          plan_id: 'free',
          credits_balance: 100,
          subscription_id: null,
          stripe_customer_id: null,
          stripe_subscription_id: null,
          stripe_current_period_end: null,
          stripe_price_id: null,
          stripe_payment_method_id: null,
        },
      };
    }
  } catch (error) {
    console.error('tRPC context auth error:', error);
  }

  return createInnerTRPCContext({
    user,
    db,
  });
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;

export const publicProcedure = t.procedure;

const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user, // user is now guaranteed to be non-null
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);