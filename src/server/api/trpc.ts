import { initTRPC, TRPCError } from '@trpc/server';
import { type CreateNextContextOptions } from '@trpc/server/adapters/next';
import { db } from './db';
import superjson from 'superjson';
import { ZodError } from 'zod';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface Session {
  user: User;
}

interface CreateContextOptions {
  session: Session | null;
}

const createInnerTRPCContext = (opts: CreateContextOptions) => {
  return {
    session: opts.session,
    db,
  };
};

export const createTRPCContext = async (opts: CreateNextContextOptions) => {
  // For API routes, we need to handle auth differently
  let session: Session | null = null;
  
  try {
    // DEV MODE: Auto-authenticate for development
    if (process.env.NODE_ENV === 'development') {
      session = {
        user: {
          id: 'dev-user-1',
          email: 'dev@vidgenie.com',
          name: 'Développeur',
        },
      };
      return createInnerTRPCContext({ session });
    }

    // Try to get user from authorization header
    const authHeader = opts.req.headers.authorization;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      // We'll validate the token in the auth context
      // For now, create a simple session structure
    }
  } catch (error) {
    console.error('Auth context error:', error);
  }

  return createInnerTRPCContext({
    session,
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
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);