/**
 * Tests unitaires pour PromptEnhancerService
 * Phase 4 - Testing & Launch du PRD V2
 */

import { PromptEnhancerService } from '../../src/services/prompt-enhancer';
import OpenAI from 'openai';

// Mock OpenAI
jest.mock('openai');
const MockedOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

describe('PromptEnhancerService', () => {
  let service: PromptEnhancerService;
  let mockOpenAI: jest.Mocked<OpenAI>;
  let mockCreate: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock OpenAI instance
    mockCreate = jest.fn();
    mockOpenAI = {
      chat: {
        completions: {
          create: mockCreate
        }
      }
    } as any;
    
    MockedOpenAI.mockImplementation(() => mockOpenAI);
    
    // Create service instance
    service = new PromptEnhancerService('test-api-key');
  });

  describe('constructor', () => {
    it('should initialize with API key', () => {
      expect(MockedOpenAI).toHaveBeenCalledWith({
        apiKey: 'test-api-key'
      });
    });
  });

  describe('enhance', () => {
    const mockEnhancedResponse = {
      id: 'test-completion',
      choices: [{
        message: {
          content: JSON.stringify({
            enhancedPrompt: "A beautiful sunset landscape with vibrant colors, dramatic clouds, and golden hour lighting, highly detailed, cinematic composition",
            improvements: [
              "Added specific details about lighting and atmosphere",
              "Enhanced visual descriptors for better AI generation",
              "Added composition guidance"
            ],
            confidence: 0.9,
            estimatedQuality: "high",
            tags: ["landscape", "sunset", "cinematic", "dramatic"]
          })
        }
      }],
      usage: {
        prompt_tokens: 50,
        completion_tokens: 100,
        total_tokens: 150
      }
    };

    beforeEach(() => {
      mockCreate.mockResolvedValue(mockEnhancedResponse);
    });

    it('should enhance a simple prompt successfully', async () => {
      const originalPrompt = "A sunset landscape";
      
      const result = await service.enhance(originalPrompt);
      
      expect(result.success).toBe(true);
      expect(result.enhancedPrompt).toBe("A beautiful sunset landscape with vibrant colors, dramatic clouds, and golden hour lighting, highly detailed, cinematic composition");
      expect(result.originalPrompt).toBe(originalPrompt);
      expect(result.improvements).toHaveLength(3);
      expect(result.confidence).toBe(0.9);
      expect(result.estimatedQuality).toBe("high");
      expect(result.tags).toContain("sunset");
      expect(result.totalCost).toBe(2); // Based on calculateCost method
      expect(result.metadata.tokensUsed).toBe(150);
    });

    it('should handle enhancement options correctly', async () => {
      const options = {
        targetAudience: 'professional' as const,
        contentType: 'commercial' as const,
        language: 'en' as const,
        creativity: 0.8
      };
      
      await service.enhance("Test prompt", options);
      
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-4o-mini",
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('Target audience: professional')
            })
          ]),
          temperature: 0.8
        })
      );
    });

    it('should handle video-specific enhancements', async () => {
      const options = {
        contentType: 'video' as const
      };
      
      await service.enhance("A person walking", options);
      
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('video generation')
            })
          ])
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      const apiError = new Error('OpenAI API error');
      mockCreate.mockRejectedValue(apiError);
      
      const result = await service.enhance("Test prompt");
      
      expect(result.success).toBe(false);
      expect(result.totalCost).toBe(0);
      expect(result.error).toBe('OpenAI API error');
    });

    it('should handle invalid JSON response', async () => {
      mockCreate.mockResolvedValue({
        ...mockEnhancedResponse,
        choices: [{
          message: {
            content: "Invalid JSON response"
          }
        }]
      });
      
      const result = await service.enhance("Test prompt");
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid JSON');
    });

    it('should handle missing response content', async () => {
      mockCreate.mockResolvedValue({
        ...mockEnhancedResponse,
        choices: [{
          message: {
            content: null
          }
        }]
      });
      
      const result = await service.enhance("Test prompt");
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No response content');
    });

    it('should validate input parameters', async () => {
      const result = await service.enhance("");
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Prompt cannot be empty');
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  describe('analyzePrompt', () => {
    it('should analyze prompt characteristics correctly', () => {
      const analysis = service.analyzePrompt("A beautiful sunset landscape with mountains");
      
      expect(analysis.length).toBeGreaterThan(0);
      expect(analysis.wordCount).toBe(7);
      expect(analysis.hasStyleDescriptors).toBe(true);
      expect(analysis.complexity).toBe('medium');
      expect(analysis.suggestedEnhancements).toContain('lighting');
    });

    it('should detect simple prompts', () => {
      const analysis = service.analyzePrompt("cat");
      
      expect(analysis.complexity).toBe('simple');
      expect(analysis.hasStyleDescriptors).toBe(false);
      expect(analysis.suggestedEnhancements.length).toBeGreaterThan(0);
    });

    it('should detect complex prompts', () => {
      const complexPrompt = "A highly detailed photorealistic portrait of a cyberpunk character with neon lighting, dramatic shadows, intricate mechanical augmentations, atmospheric fog, cinematic composition, shot with a 85mm lens, professional color grading";
      const analysis = service.analyzePrompt(complexPrompt);
      
      expect(analysis.complexity).toBe('complex');
      expect(analysis.hasStyleDescriptors).toBe(true);
      expect(analysis.hasCameraSettings).toBe(true);
      expect(analysis.wordCount).toBeGreaterThan(20);
    });
  });

  describe('testConnection', () => {
    it('should test connection successfully', async () => {
      const mockModelsResponse = {
        data: [{
          id: 'gpt-4o-mini',
          object: 'model'
        }]
      };

      mockOpenAI.models = {
        list: jest.fn().mockResolvedValue(mockModelsResponse)
      } as any;

      const result = await service.testConnection();
      
      expect(result.success).toBe(true);
      expect(result.model).toBe('gpt-4o-mini');
      expect(result.error).toBeUndefined();
    });

    it('should handle connection errors', async () => {
      const apiError = new Error('Network error');
      mockOpenAI.models = {
        list: jest.fn().mockRejectedValue(apiError)
      } as any;

      const result = await service.testConnection();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('calculateCost', () => {
    it('should calculate cost for different token counts', () => {
      expect(service.calculateCost(100)).toBe(1); // Less than 500 tokens
      expect(service.calculateCost(750)).toBe(2); // 500-1000 tokens  
      expect(service.calculateCost(1500)).toBe(3); // 1000-2000 tokens
      expect(service.calculateCost(2500)).toBe(5); // More than 2000 tokens
    });

    it('should handle zero tokens', () => {
      expect(service.calculateCost(0)).toBe(1); // Minimum cost
    });
  });

  describe('getModelCapabilities', () => {
    it('should return correct model capabilities', () => {
      const capabilities = service.getModelCapabilities();
      
      expect(capabilities.model).toBe('gpt-4o-mini');
      expect(capabilities.maxTokens).toBe(4096);
      expect(capabilities.supportedLanguages).toContain('en');
      expect(capabilities.supportedLanguages).toContain('fr');
      expect(capabilities.features).toContain('text-enhancement');
      expect(capabilities.features).toContain('style-suggestions');
    });
  });

  describe('private methods', () => {
    describe('buildSystemPrompt', () => {
      it('should build system prompt with default options', () => {
        const systemPrompt = (service as any).buildSystemPrompt({});
        
        expect(systemPrompt).toContain('You are an expert AI prompt engineer');
        expect(systemPrompt).toContain('Target audience: general');
        expect(systemPrompt).toContain('Content type: image');
      });

      it('should include custom options in system prompt', () => {
        const options = {
          targetAudience: 'professional' as const,
          contentType: 'video' as const,
          language: 'fr' as const
        };
        
        const systemPrompt = (service as any).buildSystemPrompt(options);
        
        expect(systemPrompt).toContain('Target audience: professional');
        expect(systemPrompt).toContain('Content type: video');
        expect(systemPrompt).toContain('Language: fr');
      });
    });

    describe('parseEnhancementResponse', () => {
      it('should parse valid JSON response', () => {
        const validResponse = JSON.stringify({
          enhancedPrompt: "Enhanced test prompt",
          improvements: ["Added detail"],
          confidence: 0.8,
          estimatedQuality: "high",
          tags: ["test"]
        });

        const result = (service as any).parseEnhancementResponse(validResponse);
        
        expect(result.enhancedPrompt).toBe("Enhanced test prompt");
        expect(result.confidence).toBe(0.8);
      });

      it('should handle invalid JSON', () => {
        expect(() => {
          (service as any).parseEnhancementResponse("Invalid JSON");
        }).toThrow('Invalid JSON');
      });

      it('should validate required fields', () => {
        const incompleteResponse = JSON.stringify({
          improvements: ["Added detail"]
          // Missing enhancedPrompt
        });

        expect(() => {
          (service as any).parseEnhancementResponse(incompleteResponse);
        }).toThrow('Missing required field');
      });
    });

    describe('parseError', () => {
      it('should extract error message from OpenAI error', () => {
        const openaiError = {
          response: {
            data: {
              error: {
                message: "Invalid API key"
              }
            }
          }
        };

        const message = (service as any).parseError(openaiError);
        expect(message).toBe("Invalid API key");
      });

      it('should handle generic Error objects', () => {
        const genericError = new Error("Generic error message");
        const message = (service as any).parseError(genericError);
        expect(message).toBe("Generic error message");
      });

      it('should handle string errors', () => {
        const message = (service as any).parseError("String error");
        expect(message).toBe("String error");
      });

      it('should handle unknown error types', () => {
        const message = (service as any).parseError({ unknown: "error" });
        expect(message).toBe("Unknown prompt enhancement error");
      });
    });
  });

  describe('edge cases', () => {
    it('should handle very long prompts', async () => {
      const longPrompt = "A ".repeat(1000) + "sunset";
      
      const result = await service.enhance(longPrompt);
      
      // Should still work but might be truncated
      expect(mockCreate).toHaveBeenCalled();
    });

    it('should handle prompts with special characters', async () => {
      const specialPrompt = "A prompt with émojis 🌅 and spéciàl characters: @#$%";
      
      await service.enhance(specialPrompt);
      
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining(specialPrompt)
            })
          ])
        })
      );
    });

    it('should handle concurrent enhancement requests', async () => {
      const promises = [
        service.enhance("Prompt 1"),
        service.enhance("Prompt 2"),
        service.enhance("Prompt 3")
      ];
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      expect(mockCreate).toHaveBeenCalledTimes(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });
});