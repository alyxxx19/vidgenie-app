import { createTRPCRouter } from './trpc';
import { jobsRouter } from './routers/jobs';
import { assetsRouter } from './routers/assets';
import { postsRouter } from './routers/posts';
import { promptsRouter } from './routers/prompts';
import { publishingRouter } from './routers/publishing';
import { creditsRouter } from './routers/credits';
import { analyticsRouter } from './routers/analytics';
import { stripeRouter } from './routers/stripe';

export const appRouter = createTRPCRouter({
  jobs: jobsRouter,
  assets: assetsRouter,
  posts: postsRouter,
  prompts: promptsRouter,
  publishing: publishingRouter,
  credits: creditsRouter,
  analytics: analyticsRouter,
  stripe: stripeRouter,
});

export type AppRouter = typeof appRouter;