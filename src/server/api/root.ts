import { createTRPCRouter } from './trpc';
import { jobsRouter } from './routers/jobs';
import { assetsRouter } from './routers/assets';
import { postsRouter } from './routers/posts';
import { promptsRouter } from './routers/prompts';
import { publishingRouter } from './routers/publishing';
import { creditsRouter } from './routers/credits';
import { analyticsRouter } from './routers/analytics';
import { stripeRouter } from './routers/stripe';
import { projectsRouter } from './routers/projects';
import { generationRouter } from './routers/generation';
import { userRouter } from './routers/user';

export const appRouter = createTRPCRouter({
  jobs: jobsRouter,
  assets: assetsRouter,
  posts: postsRouter,
  prompts: promptsRouter,
  publishing: publishingRouter,
  credits: creditsRouter,
  analytics: analyticsRouter,
  stripe: stripeRouter,
  projects: projectsRouter,
  generation: generationRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;