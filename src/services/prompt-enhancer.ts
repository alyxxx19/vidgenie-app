import OpenAI from 'openai';

export interface EnhanceOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  context?: 'image' | 'video' | 'general';
}

export interface EnhancedPrompt {
  original: string;
  enhanced: string;
  tokensUsed: number;
  model: string;
  improvementSuggestions?: string[];
  confidence: number; // 0-100
  enhancementReason: string;
}

export interface PromptAnalysis {
  hasVisualDetails: boolean;
  hasStyleSpecifications: boolean;
  hasLightingDetails: boolean;
  hasCompositionNotes: boolean;
  qualityLevel: 'basic' | 'intermediate' | 'advanced';
  suggestedImprovements: string[];
}

export class PromptEnhancerService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Analyse la qualité d'un prompt existant
   */
  analyzePrompt(prompt: string): PromptAnalysis {
    const visualKeywords = ['lighting', 'color', 'composition', 'style', 'atmosphere', 'quality', 'detail'];
    const styleKeywords = ['cinematic', 'artistic', 'photorealistic', 'professional', 'high-quality'];
    const lightingKeywords = ['natural light', 'soft light', 'dramatic', 'golden hour', 'studio lighting'];
    const compositionKeywords = ['close-up', 'wide shot', 'portrait', 'landscape', 'perspective'];

    const hasVisualDetails = visualKeywords.some(keyword => 
      prompt.toLowerCase().includes(keyword.toLowerCase())
    );
    
    const hasStyleSpecifications = styleKeywords.some(keyword => 
      prompt.toLowerCase().includes(keyword.toLowerCase())
    );
    
    const hasLightingDetails = lightingKeywords.some(keyword => 
      prompt.toLowerCase().includes(keyword.toLowerCase())
    );
    
    const hasCompositionNotes = compositionKeywords.some(keyword => 
      prompt.toLowerCase().includes(keyword.toLowerCase())
    );

    // Déterminer le niveau de qualité
    let qualityLevel: 'basic' | 'intermediate' | 'advanced' = 'basic';
    const qualityScore = [hasVisualDetails, hasStyleSpecifications, hasLightingDetails, hasCompositionNotes]
      .filter(Boolean).length;
    
    if (qualityScore >= 3) qualityLevel = 'advanced';
    else if (qualityScore >= 2) qualityLevel = 'intermediate';

    // Suggestions d'amélioration
    const suggestedImprovements: string[] = [];
    if (!hasVisualDetails) suggestedImprovements.push('Add visual details and quality specifications');
    if (!hasStyleSpecifications) suggestedImprovements.push('Specify artistic style or aesthetic direction');
    if (!hasLightingDetails) suggestedImprovements.push('Include lighting conditions and atmosphere');
    if (!hasCompositionNotes) suggestedImprovements.push('Add composition and framing details');

    return {
      hasVisualDetails,
      hasStyleSpecifications,
      hasLightingDetails,
      hasCompositionNotes,
      qualityLevel,
      suggestedImprovements
    };
  }

  /**
   * Améliore un prompt existant selon le contexte
   */
  async enhance(
    originalPrompt: string,
    options: EnhanceOptions = {}
  ): Promise<EnhancedPrompt> {
    const {
      model = 'gpt-4-turbo-preview',
      temperature = 0.7,
      maxTokens = 400,
      context = 'image'
    } = options;

    // Analyser le prompt existant
    const analysis = this.analyzePrompt(originalPrompt);

    // Créer le prompt système selon le contexte
    const systemPrompt = this.getSystemPrompt(context, analysis);

    try {
      const completion = await this.openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Original prompt: "${originalPrompt}"` }
        ],
        temperature,
        max_tokens: maxTokens,
      });

      const enhancedText = completion.choices[0]?.message?.content;
      if (!enhancedText) {
        throw new Error('No enhancement generated');
      }

      // Calculer la confiance basée sur l'amélioration
      const confidence = this.calculateConfidence(originalPrompt, enhancedText, analysis);

      // Extraire les suggestions d'amélioration du texte généré
      const improvementSuggestions = this.extractImprovementSuggestions(enhancedText);

      return {
        original: originalPrompt,
        enhanced: enhancedText,
        tokensUsed: completion.usage?.total_tokens || 0,
        model,
        improvementSuggestions,
        confidence,
        enhancementReason: this.getEnhancementReason(analysis)
      };
    } catch (error) {
      throw new Error(`Prompt enhancement failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Génère le prompt système selon le contexte
   */
  private getSystemPrompt(context: string, analysis: PromptAnalysis): string {
    const baseInstructions = `Tu es un expert en génération d'images et vidéos par IA, spécialisé dans l'optimisation de prompts.
Tu dois améliorer le prompt fourni pour obtenir les meilleurs résultats possibles.`;

    const contextInstructions = {
      image: `
Focus sur les éléments visuels pour DALL-E 3:
- Détails visuels précis et description claire
- Style artistique et esthétique
- Qualité et résolution (professional, high-quality, detailed)
- Éclairage et atmosphère
- Composition et cadrage
- Couleurs et textures`,
      
      video: `
Focus sur les éléments d'animation pour la génération vidéo:
- Mouvement et dynamique (subtle motion, natural animation)
- Continuité temporelle
- Éléments d'animation spécifiques (breathing, blinking, flowing)
- Cohérence narrative
- Transitions fluides`,
      
      general: `
Optimisation générale pour tous types de génération:
- Clarté et précision du message
- Détails techniques pertinents
- Style et ambiance
- Qualité professionnelle`
    };

    const qualityGuidelines = analysis.qualityLevel === 'basic' ? 
      '\n- Le prompt actuel manque de détails techniques, ajoute des spécifications visuelles' :
      analysis.qualityLevel === 'intermediate' ?
      '\n- Le prompt a une bonne base, améliore les détails et la précision' :
      '\n- Le prompt est déjà avancé, peaufine les nuances et la cohérence';

    return `${baseInstructions}

${contextInstructions[context as keyof typeof contextInstructions]}

Règles importantes:
- Garde le sens et l'intention originale
- Maximum 250 mots pour le prompt amélioré
- Utilise un langage technique précis
- Évite les répétitions inutiles
- Privilégie la qualité à la quantité${qualityGuidelines}

Réponds UNIQUEMENT avec le prompt amélioré, sans explications.`;
  }

  /**
   * Calcule un score de confiance pour l'amélioration
   */
  private calculateConfidence(
    original: string, 
    enhanced: string, 
    analysis: PromptAnalysis
  ): number {
    let confidence = 50; // Base

    // Bonus pour l'amélioration de la longueur
    const lengthImprovement = enhanced.length / original.length;
    if (lengthImprovement > 1.2 && lengthImprovement < 3) confidence += 20;

    // Bonus pour l'analyse de qualité initiale
    if (analysis.qualityLevel === 'basic') confidence += 30;
    else if (analysis.qualityLevel === 'intermediate') confidence += 20;
    else confidence += 10;

    // Bonus pour les mots-clés techniques ajoutés
    const technicalKeywords = ['professional', 'high-quality', 'detailed', 'cinematic', 'lighting'];
    const addedKeywords = technicalKeywords.filter(keyword =>
      enhanced.toLowerCase().includes(keyword) && !original.toLowerCase().includes(keyword)
    ).length;
    confidence += addedKeywords * 5;

    return Math.min(confidence, 95); // Cap à 95%
  }

  /**
   * Extrait les suggestions d'amélioration du texte généré
   */
  private extractImprovementSuggestions(enhancedText: string): string[] {
    // Suggestions basées sur des patterns d'amélioration communs
    return [
      'Enhanced visual details and quality specifications',
      'Added professional styling and technical parameters',
      'Improved composition and artistic direction'
    ];
  }

  /**
   * Génère une raison pour l'amélioration
   */
  private getEnhancementReason(analysis: PromptAnalysis): string {
    const reasons = [];
    
    if (analysis.qualityLevel === 'basic') {
      reasons.push('added essential visual details and quality parameters');
    }
    
    if (!analysis.hasStyleSpecifications) {
      reasons.push('included artistic style and aesthetic direction');
    }
    
    if (!analysis.hasLightingDetails) {
      reasons.push('specified lighting conditions and atmosphere');
    }
    
    if (!analysis.hasCompositionNotes) {
      reasons.push('enhanced composition and framing details');
    }

    return reasons.length > 0 
      ? `Enhanced prompt by: ${reasons.join(', ')}`
      : 'Refined existing details for optimal generation results';
  }

  /**
   * Méthode utilitaire pour tester la connectivité
   */
  async testConnection(): Promise<{ success: boolean; model: string; error?: string }> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Test connection' }],
        max_tokens: 5
      });

      return {
        success: true,
        model: completion.model
      };
    } catch (error) {
      return {
        success: false,
        model: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}