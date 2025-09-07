import { useState } from 'react';
import { toast } from 'sonner';
import { secureLog } from '@/lib/secure-logger';

interface TestEnhancementRequest {
  prompt: string;
  enhanceEnabled?: boolean;
  temperature?: number;
  mood?: string;
  artStyle?: string;
  composition?: string;
  negativePrompt?: string;
}

interface TestEnhancementResponse {
  success: boolean;
  testMode: boolean;
  originalPrompt: string;
  enhancedPrompt?: string;
  finalPrompt: string;
  mockImageUrl: string;
  enhanceEnabled: boolean;
  enhancementWorked: boolean;
  settings: {
    temperature?: number;
    mood?: string;
    artStyle?: string;
    composition?: string;
    negativePrompt?: string;
  };
  note: string;
  message: string;
}

export function useTestPromptEnhancement() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [testResult, setTestResult] = useState<TestEnhancementResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const testPromptEnhancement = async (request: TestEnhancementRequest): Promise<TestEnhancementResponse | null> => {
    try {
      setIsGenerating(true);
      setError(null);
      setTestResult(null);

      secureLog.info('[TEST-HOOK] Testing prompt enhancement:', request.prompt.slice(0, 50));

      const response = await fetch('/api/test-prompt-enhancement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        secureLog.error('[TEST-HOOK] API Error:', data);
        throw new Error(data.error || 'Test failed');
      }

      secureLog.info('[TEST-HOOK] Test successful:', data.finalPrompt);
      
      if (data.enhancementWorked) {
        secureLog.info('[TEST-HOOK] GPT enhancement worked!');
        secureLog.info('[TEST-HOOK] Original:', data.originalPrompt);
        secureLog.info('[TEST-HOOK] Enhanced:', data.enhancedPrompt);
      }

      setTestResult(data);
      toast.success(
        data.enhancementWorked 
          ? 'Prompt enhanced successfully! ✨' 
          : data.enhanceEnabled 
            ? 'Enhancement failed, using original prompt ⚠️'
            : 'Enhancement disabled 🔧'
      );
      return data;

    } catch (err: any) {
      secureLog.error('[TEST-HOOK] Test failed:', err);
      const errorMessage = err.message || 'Prompt enhancement test failed';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const resetState = () => {
    setTestResult(null);
    setError(null);
    setIsGenerating(false);
  };

  return {
    testPromptEnhancement,
    isGenerating,
    testResult,
    error,
    resetState,
  };
}