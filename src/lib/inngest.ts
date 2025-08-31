import { Inngest } from 'inngest';

export const inngest = new Inngest({ 
  id: 'vidgenie',
  name: 'Vidgenie Content Generation',
});

export type GenerationStartEvent = {
  name: 'generation/start';
  data: {
    jobId: string;
  };
};

export type PublishingStartEvent = {
  name: 'publishing/start';
  data: {
    postId: string;
  };
};

export type Events = GenerationStartEvent | PublishingStartEvent;