import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { type NextRequest } from 'next/server';
import { appRouter } from '@/server/api/root';
import { createTRPCContext } from '@/server/api/trpc';
import { secureLog } from '@/lib/secure-logger';

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ req: req as any, res: {} as any, info: {} as any }),
    onError:
      process.env.NODE_ENV === 'development'
        ? ({ path, error }) => {
            secureLog.error(
              `❌ tRPC failed on ${path ?? '<no-path>'}: ${error.message}`
            );
          }
        : undefined,
  });

export { handler as GET, handler as POST };