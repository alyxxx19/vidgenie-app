import { useState } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface GenerateImageRequest {
  prompt: string;
  style?: 'natural' | 'vivid';
  quality?: 'standard' | 'hd';
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  projectId?: string;
}

interface GenerateImageResponse {
  success: boolean;
  jobId: string;
  imageUrl: string;
  assetId: string;
  revisedPrompt: string;
  creditsUsed: number;
  remainingCredits: number;
}

export function useSimpleImageGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<GenerateImageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateImage = async (request: GenerateImageRequest): Promise<GenerateImageResponse | null> => {
    try {
      setIsGenerating(true);
      setError(null);
      setGenerationResult(null);

      console.log('[HOOK] Starting image generation:', request.prompt.slice(0, 50));

      // Obtenir le token d'authentification Supabase
      const supabase = createClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('/api/simple-generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      console.log('[HOOK] Image generated successfully:', data.imageUrl);

      setGenerationResult(data);
      toast.success('Image generated successfully!');
      return data;

    } catch (err: any) {
      console.error('[HOOK] Generation failed:', err);
      const errorMessage = err.message || 'Image generation failed';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const resetState = () => {
    setGenerationResult(null);
    setError(null);
    setIsGenerating(false);
  };

  return {
    generateImage,
    isGenerating,
    generationResult,
    error,
    resetState,
  };
}