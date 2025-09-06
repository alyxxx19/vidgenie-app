'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Wand2,
  Image,
  Video,
  FileVideo,
  Sparkles,
  Settings,
  Upload,
  Download,
  ArrowDown,
  Play,
  Zap,
  RefreshCw,
  Info
} from 'lucide-react';

export type WorkflowType = 'complete' | 'image-only' | 'video-from-image';

export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  technicalDescription: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'pending' | 'active' | 'completed' | 'error';
  estimatedTime?: string;
  provider?: string;
  cost?: number;
  apiEndpoint?: string;
}

interface WorkflowStepsVisualizerProps {
  workflowType: WorkflowType;
  currentStep?: number;
  className?: string;
  onStepClick?: (stepId: string) => void;
}

export function WorkflowStepsVisualizer({ 
  workflowType, 
  currentStep = 0,
  className,
  onStepClick 
}: WorkflowStepsVisualizerProps) {

  const getWorkflowSteps = (type: WorkflowType): WorkflowStep[] => {
    switch (type) {
      case 'complete':
        return [
          {
            id: 'prompt_input',
            title: 'prompt_input',
            description: 'User provides image and video description',
            technicalDescription: 'Natural language processing of user requirements',
            icon: Wand2,
            status: currentStep >= 1 ? 'completed' : currentStep === 0 ? 'active' : 'pending',
            estimatedTime: '~30s',
            cost: 0,
            apiEndpoint: '/api/prompt/validate'
          },
          {
            id: 'gpt_enhance',
            title: 'gpt_enhancement',
            description: 'AI optimizes prompts for better generation',
            technicalDescription: 'GPT-4 analyzes and enhances user prompts with artistic techniques',
            icon: Sparkles,
            status: currentStep >= 2 ? 'completed' : currentStep === 1 ? 'active' : 'pending',
            estimatedTime: '~15s',
            provider: 'openai_gpt4',
            cost: 1,
            apiEndpoint: '/api/ai/enhance-prompt'
          },
          {
            id: 'dalle_gen',
            title: 'image_generation',
            description: 'DALL-E 3 creates high-quality image',
            technicalDescription: 'Advanced diffusion model generates 1024x1792 image from enhanced prompt',
            icon: Image,
            status: currentStep >= 3 ? 'completed' : currentStep === 2 ? 'active' : 'pending',
            estimatedTime: '~45s',
            provider: 'openai_dalle3',
            cost: 5,
            apiEndpoint: '/api/ai/generate-image'
          },
          {
            id: 'veo3_gen',
            title: 'video_generation',
            description: 'VEO3 transforms image into 8s video',
            technicalDescription: 'State-of-the-art video diffusion model animates static content',
            icon: Video,
            status: currentStep >= 4 ? 'completed' : currentStep === 3 ? 'active' : 'pending',
            estimatedTime: '~180s',
            provider: 'google_veo3',
            cost: 15,
            apiEndpoint: '/api/ai/generate-video'
          },
          {
            id: 'finalization',
            title: 'output_delivery',
            description: 'Process assets and deliver final results',
            technicalDescription: 'Storage optimization, metadata generation, and user delivery',
            icon: Download,
            status: currentStep >= 5 ? 'completed' : currentStep === 4 ? 'active' : 'pending',
            estimatedTime: '~10s',
            cost: 0,
            apiEndpoint: '/api/assets/finalize'
          }
        ];

      case 'image-only':
        return [
          {
            id: 'prompt_input',
            title: 'prompt_input',
            description: 'User provides image description',
            technicalDescription: 'Natural language processing for image generation',
            icon: Wand2,
            status: currentStep >= 1 ? 'completed' : currentStep === 0 ? 'active' : 'pending',
            estimatedTime: '~30s',
            cost: 0
          },
          {
            id: 'gpt_enhance',
            title: 'gpt_enhancement',
            description: 'AI optimizes prompt for DALL-E 3',
            technicalDescription: 'GPT-4 enhances prompt with artistic terminology and composition',
            icon: Sparkles,
            status: currentStep >= 2 ? 'completed' : currentStep === 1 ? 'active' : 'pending',
            estimatedTime: '~15s',
            provider: 'openai_gpt4',
            cost: 1
          },
          {
            id: 'dalle_gen',
            title: 'image_generation',
            description: 'DALL-E 3 creates high-quality image',
            technicalDescription: 'Advanced diffusion model generates high-resolution image',
            icon: Image,
            status: currentStep >= 3 ? 'completed' : currentStep === 2 ? 'active' : 'pending',
            estimatedTime: '~45s',
            provider: 'openai_dalle3',
            cost: 5
          }
        ];

      case 'video-from-image':
        return [
          {
            id: 'image_upload',
            title: 'image_upload',
            description: 'Upload and validate source image',
            technicalDescription: 'Image processing, validation, and optimization for video generation',
            icon: Upload,
            status: currentStep >= 1 ? 'completed' : currentStep === 0 ? 'active' : 'pending',
            estimatedTime: '~10s',
            cost: 0
          },
          {
            id: 'veo3_gen',
            title: 'video_generation',
            description: 'VEO3 transforms image into 8s video',
            technicalDescription: 'Advanced video diffusion model creates smooth animation',
            icon: Video,
            status: currentStep >= 2 ? 'completed' : currentStep === 1 ? 'active' : 'pending',
            estimatedTime: '~180s',
            provider: 'google_veo3',
            cost: 15
          },
          {
            id: 'finalization',
            title: 'output_delivery',
            description: 'Process and deliver final video',
            technicalDescription: 'Video optimization, encoding, and user delivery',
            icon: Download,
            status: currentStep >= 3 ? 'completed' : currentStep === 2 ? 'active' : 'pending',
            estimatedTime: '~10s',
            cost: 0
          }
        ];

      default:
        return [];
    }
  };

  const steps = getWorkflowSteps(workflowType);
  
  const getStatusIcon = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'active':
        return <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColors = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'completed': return {
        border: 'border-green-500/40',
        bg: 'bg-green-500/10',
        text: 'text-green-400'
      };
      case 'active': return {
        border: 'border-blue-500/40',
        bg: 'bg-blue-500/10',
        text: 'text-blue-400'
      };
      case 'error': return {
        border: 'border-red-500/40',
        bg: 'bg-red-500/10',
        text: 'text-red-400'
      };
      default: return {
        border: 'border-border',
        bg: 'bg-secondary/20',
        text: 'text-muted-foreground'
      };
    }
  };

  const getStepIndicator = (index: number, status: WorkflowStep['status']) => {
    const colors = getStatusColors(status);
    
    return (
      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 ${colors.border} ${colors.bg} flex items-center justify-center flex-shrink-0 transition-all duration-200`}>
        {status === 'completed' ? (
          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
        ) : status === 'active' ? (
          <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 animate-spin" />
        ) : status === 'error' ? (
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
        ) : (
          <span className={`text-xs sm:text-sm font-mono font-medium ${colors.text}`}>
            {index + 1}
          </span>
        )}
        
        {/* Processing Ring */}
        {status === 'active' && (
          <div className="absolute inset-0 rounded-full border-2 border-blue-400/30 animate-ping" />
        )}
      </div>
    );
  };

  const totalCost = steps.reduce((sum, step) => sum + (step.cost || 0), 0);
  const totalTime = steps.length > 3 ? '4-6min' : steps.length > 2 ? '2-3min' : '1-2min';
  const completedSteps = steps.filter(s => s.status === 'completed').length;

  const getWorkflowTitle = () => {
    switch (workflowType) {
      case 'complete': return 'image_to_video_pipeline';
      case 'image-only': return 'dalle3_image_generation';
      case 'video-from-image': return 'veo3_video_generation';
      default: return 'ai_workflow';
    }
  };

  const getWorkflowDescription = () => {
    switch (workflowType) {
      case 'complete': return 'complete pipeline: text → image → video';
      case 'image-only': return 'create stunning images with dall-e 3';
      case 'video-from-image': return 'transform images into animated videos';
      default: return 'ai generation workflow';
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Header Section */}
      <div className="bg-card border border-border rounded-lg overflow-hidden mb-6">
        <div className="border-b border-border bg-secondary/50">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="flex items-center justify-center w-6 h-6 bg-white rounded flex-shrink-0">
                <FileVideo className="w-3 h-3 text-black" />
              </div>
              <div className="min-w-0">
                <h2 className="font-mono text-sm sm:text-base text-white truncate">
                  {getWorkflowTitle()}
                </h2>
                <p className="text-xs text-muted-foreground font-mono hidden sm:block">
                  {getWorkflowDescription()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <Badge className="bg-muted text-muted-foreground font-mono text-xs">
                {totalCost}_credits
              </Badge>
              <Badge className="bg-secondary/50 text-white font-mono text-xs hidden sm:inline-flex">
                ~{totalTime}
              </Badge>
            </div>
          </div>
        </div>
        
        {/* Progress Overview */}
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <div className="text-center p-3 bg-secondary/30 border border-border rounded">
              <div className="text-lg sm:text-xl font-mono text-white font-medium">
                {completedSteps}
              </div>
              <div className="text-xs text-muted-foreground font-mono">completed</div>
            </div>
            <div className="text-center p-3 bg-secondary/30 border border-border rounded">
              <div className="text-lg sm:text-xl font-mono text-white font-medium">
                {steps.length}
              </div>
              <div className="text-xs text-muted-foreground font-mono">total_steps</div>
            </div>
            <div className="text-center p-3 bg-secondary/30 border border-border rounded">
              <div className="text-lg sm:text-xl font-mono text-white font-medium">
                {totalCost}
              </div>
              <div className="text-xs text-muted-foreground font-mono">credits</div>
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline Steps */}
      <div className="space-y-4 sm:space-y-6">
        {steps.map((step, index) => {
          const colors = getStatusColors(step.status);
          
          return (
            <div key={step.id} className="relative">
              {/* Connection Line */}
              {index < steps.length - 1 && (
                <div className="absolute left-4 sm:left-5 top-12 sm:top-14 w-px h-6 sm:h-8 bg-border" />
              )}
              
              {/* Step Card */}
              <div className="flex items-start gap-3 sm:gap-4">
                {/* Step Indicator */}
                <div className="relative">
                  {getStepIndicator(index, step.status)}
                </div>
                
                {/* Step Content */}
                <div className="flex-1 min-w-0">
                  <div className={`bg-card border-2 ${colors.border} ${colors.bg} rounded-lg overflow-hidden transition-all duration-200 cursor-pointer hover:scale-[1.02]`}
                       onClick={() => onStepClick?.(step.id)}>
                    <div className="border-b border-border bg-secondary/50">
                      <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <step.icon className={`w-4 h-4 ${colors.text} flex-shrink-0`} />
                          <h3 className={`font-mono text-sm ${colors.text} font-medium truncate`}>
                            {step.title}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {step.cost !== undefined && step.cost > 0 && (
                            <Badge className="bg-muted text-muted-foreground font-mono text-xs">
                              {step.cost}c
                            </Badge>
                          )}
                          {getStatusIcon(step.status)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <p className="text-sm text-white font-mono mb-3">
                        {step.description}
                      </p>
                      
                      <div className="text-xs text-muted-foreground font-mono mb-3 hidden sm:block">
                        {step.technicalDescription}
                      </div>
                      
                      <div className="flex items-center justify-between text-xs font-mono">
                        <div className="flex items-center gap-3 text-muted-foreground">
                          {step.estimatedTime && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{step.estimatedTime}</span>
                            </div>
                          )}
                          {step.provider && (
                            <div className="flex items-center gap-1">
                              <Settings className="w-3 h-3" />
                              <span className="hidden sm:inline">{step.provider}</span>
                              <span className="sm:hidden">API</span>
                            </div>
                          )}
                        </div>
                        
                        {step.status === 'active' && (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                            <span className={colors.text}>processing</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Summary */}
      <div className="mt-6 bg-card border border-border rounded-lg overflow-hidden">
        <div className="border-b border-border bg-secondary/50">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex items-center justify-center w-5 h-5 bg-white rounded">
              <Info className="w-2.5 h-2.5 text-black" />
            </div>
            <h3 className="font-mono text-sm text-white">pipeline_summary</h3>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between text-sm font-mono">
            <div className="flex items-center gap-4">
              <span className="text-white">
                progress: {completedSteps}/{steps.length}
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="text-white">
                cost: {totalCost}_credits
              </span>
              <span className="text-muted-foreground hidden sm:inline">•</span>
              <span className="text-white hidden sm:inline">
                eta: ~{totalTime}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {currentStep === 0 ? (
                <>
                  <Play className="w-3 h-3 text-green-400" />
                  <span className="text-green-400">ready</span>
                </>
              ) : completedSteps === steps.length ? (
                <>
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  <span className="text-green-400">complete</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />
                  <span className="text-blue-400">running</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}