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
  revisedPrompt: string;
  creditsUsed: number;
  remainingCredits: number;
  note?: string;
}

export function useMockImageGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<GenerateImageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateImage = async (request: GenerateImageRequest): Promise<GenerateImageResponse | null> => {
    try {
      setIsGenerating(true);
      setError(null);
      setGenerationResult(null);

      console.log('[MOCK-HOOK] Starting mock image generation:', request.prompt.slice(0, 50));

      const response = await fetch('/api/mock-generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[MOCK-HOOK] API Error:', data);
        throw new Error(data.error || 'Generation failed');
      }

      console.log('[MOCK-HOOK] Mock image generated successfully:', data.imageUrl);

      setGenerationResult(data);
      toast.success(data.note || 'Mock image generated successfully!');
      return data;

    } catch (err: any) {
      console.error('[MOCK-HOOK] Generation failed:', err);
      const errorMessage = err.message || 'Mock image generation failed';
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