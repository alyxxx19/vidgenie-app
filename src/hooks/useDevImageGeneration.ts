import { useState } from 'react';
import { toast } from 'sonner';

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
  originalPrompt?: string;
  enhancedPrompt?: string;
  revisedPrompt: string;
  creditsUsed: number;
  remainingCredits: number;
  note?: string;
}

export function useDevImageGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<GenerateImageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateImage = async (request: GenerateImageRequest): Promise<GenerateImageResponse | null> => {
    try {
      setIsGenerating(true);
      setError(null);
      setGenerationResult(null);

      console.log('[DEV-HOOK] Starting image generation:', request.prompt.slice(0, 50));

      const response = await fetch('/api/dev-generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[DEV-HOOK] API Error:', data);
        throw new Error(data.error || 'Generation failed');
      }

      console.log('[DEV-HOOK] Image generated successfully:', data.imageUrl);
      if (data.enhancedPrompt && data.enhancedPrompt !== data.originalPrompt) {
        console.log('[DEV-HOOK] Prompt was enhanced by GPT');
      }

      setGenerationResult(data);
      toast.success(
        data.note?.includes('enhanced') 
          ? 'Image generated with GPT-enhanced prompt!' 
          : 'Image generated successfully!'
      );
      return data;

    } catch (err: any) {
      console.error('[DEV-HOOK] Generation failed:', err);
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