import { api } from '@/app/providers';

export function useVideoTemplates(category?: string, search?: string) {
  return api.prompts.getVideoTemplates.useQuery({ 
    category: category as any, 
    search 
  });
}

export function useVideoTemplate(id: string) {
  return api.prompts.getVideoTemplate.useQuery({ id });
}

export function useEnhancePrompt() {
  return api.prompts.enhancePrompt.useMutation();
}

export function useSaveVideoTemplate() {
  return api.prompts.saveVideoTemplate.useMutation();
}

export function useVideoPrompts(type?: 'video' | 'image-to-video') {
  return api.prompts.list.useQuery({ 
    type: type || 'video', 
    limit: 50 
  });
}