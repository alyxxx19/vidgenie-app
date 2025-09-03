// Client-safe prompt utilities (no OpenAI dependency)

export const promptUtils = {
  estimateTokens: (text: string): number => {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  },
  
  estimateCost: (prompt: string, quality: 'standard' | 'hd' = 'hd'): number => {
    // DALL-E 3 pricing (approximate)
    const tokens = promptUtils.estimateTokens(prompt);
    const baseCredits = quality === 'hd' ? 5 : 3;
    const complexityMultiplier = Math.min(1.5, 1 + (tokens / 100));
    return Math.ceil(baseCredits * complexityMultiplier);
  },
  
  validatePrompt: (prompt: string): { valid: boolean; issues: string[] } => {
    const issues: string[] = [];
    
    if (prompt.length < 10) {
      issues.push('Prompt too short (min 10 characters)');
    }
    
    if (prompt.length > 1000) {
      issues.push('Prompt too long (max 1000 characters)');
    }
    
    // Check for potentially problematic content
    const problematicWords = ['nude', 'naked', 'nsfw', 'explicit', 'sexual'];
    const lowerPrompt = prompt.toLowerCase();
    const foundProblematic = problematicWords.filter(word => lowerPrompt.includes(word));
    
    if (foundProblematic.length > 0) {
      issues.push(`Contains restricted words: ${foundProblematic.join(', ')}`);
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  },
  
  getComplexityScore: (prompt: string): 'simple' | 'medium' | 'complex' => {
    const tokens = promptUtils.estimateTokens(prompt);
    const commaCount = (prompt.match(/,/g) || []).length;
    const detailWords = ['detailed', 'intricate', 'complex', 'elaborate', 'sophisticated'].filter(
      word => prompt.toLowerCase().includes(word)
    ).length;
    
    const score = tokens + (commaCount * 2) + (detailWords * 3);
    
    if (score < 20) return 'simple';
    if (score < 50) return 'medium';
    return 'complex';
  }
};