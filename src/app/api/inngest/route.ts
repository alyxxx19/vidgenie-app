import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest';
import { generationWorker } from '@/inngest/generation';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    generationWorker,
  ],
});