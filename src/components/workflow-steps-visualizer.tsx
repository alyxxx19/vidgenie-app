'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Play
} from 'lucide-react';

export type WorkflowType = 'complete' | 'image-only' | 'video-from-image';

export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'pending' | 'active' | 'completed' | 'error';
  estimatedTime?: string;
  provider?: string;
  cost?: number;
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
            id: 'prompt',
            title: 'Create Prompt',
            description: 'Describe your image idea with natural language',
            icon: Wand2,
            status: currentStep >= 1 ? 'completed' : currentStep === 0 ? 'active' : 'pending',
            estimatedTime: '30s',
            cost: 0
          },
          {
            id: 'enhance',
            title: 'GPT Enhancement',
            description: 'AI optimizes your prompt for better results',
            icon: Sparkles,
            status: currentStep >= 2 ? 'completed' : currentStep === 1 ? 'active' : 'pending',
            estimatedTime: '15s',
            provider: 'OpenAI GPT-4',
            cost: 1
          },
          {
            id: 'image',
            title: 'Generate Image',
            description: 'DALL-E 3 creates high-quality image from prompt',
            icon: Image,
            status: currentStep >= 3 ? 'completed' : currentStep === 2 ? 'active' : 'pending',
            estimatedTime: '45s',
            provider: 'DALL-E 3',
            cost: 5
          },
          {
            id: 'video',
            title: 'Animate Video',
            description: 'VEO3 transforms static image into 8s video',
            icon: Video,
            status: currentStep >= 4 ? 'completed' : currentStep === 3 ? 'active' : 'pending',
            estimatedTime: '3min',
            provider: 'Google VEO3',
            cost: 15
          },
          {
            id: 'output',
            title: 'Final Output',
            description: 'Process complete, download your video',
            icon: Download,
            status: currentStep >= 5 ? 'completed' : currentStep === 4 ? 'active' : 'pending',
            estimatedTime: '10s',
            cost: 0
          }
        ];

      case 'image-only':
        return [
          {
            id: 'prompt',
            title: 'Create Prompt',
            description: 'Describe your image idea with natural language',
            icon: Wand2,
            status: currentStep >= 1 ? 'completed' : currentStep === 0 ? 'active' : 'pending',
            estimatedTime: '30s',
            cost: 0
          },
          {
            id: 'enhance',
            title: 'GPT Enhancement',
            description: 'AI optimizes your prompt for better results',
            icon: Sparkles,
            status: currentStep >= 2 ? 'completed' : currentStep === 1 ? 'active' : 'pending',
            estimatedTime: '15s',
            provider: 'OpenAI GPT-4',
            cost: 1
          },
          {
            id: 'image',
            title: 'Generate Image',
            description: 'DALL-E 3 creates high-quality image from prompt',
            icon: Image,
            status: currentStep >= 3 ? 'completed' : currentStep === 2 ? 'active' : 'pending',
            estimatedTime: '45s',
            provider: 'DALL-E 3',
            cost: 5
          }
        ];

      case 'video-from-image':
        return [
          {
            id: 'upload',
            title: 'Upload Image',
            description: 'Provide the image you want to animate',
            icon: Upload,
            status: currentStep >= 1 ? 'completed' : currentStep === 0 ? 'active' : 'pending',
            estimatedTime: '10s',
            cost: 0
          },
          {
            id: 'video',
            title: 'Animate Video',
            description: 'VEO3 transforms your image into 8s video',
            icon: Video,
            status: currentStep >= 2 ? 'completed' : currentStep === 1 ? 'active' : 'pending',
            estimatedTime: '3min',
            provider: 'Google VEO3',
            cost: 15
          },
          {
            id: 'output',
            title: 'Final Output',
            description: 'Process complete, download your video',
            icon: Download,
            status: currentStep >= 3 ? 'completed' : currentStep === 2 ? 'active' : 'pending',
            estimatedTime: '10s',
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
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'active':
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStatusColor = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'completed': return 'border-green-500 bg-green-50';
      case 'active': return 'border-blue-500 bg-blue-50 shadow-md';
      case 'error': return 'border-red-500 bg-red-50';
      default: return 'border-gray-200 bg-white';
    }
  };

  const getStepNumber = (index: number, status: WorkflowStep['status']) => {
    if (status === 'completed') {
      return <CheckCircle className="w-5 h-5 text-white" />;
    }
    return (
      <span className="text-sm font-mono font-semibold text-white">
        {index + 1}
      </span>
    );
  };

  const getStepNumberBg = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'active': return 'bg-blue-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const totalCost = steps.reduce((sum, step) => sum + (step.cost || 0), 0);
  const totalTime = steps.length > 3 ? '4-6 min' : steps.length > 2 ? '2-3 min' : '1-2 min';

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      {/* En-tête du workflow */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="p-2 bg-black rounded-full">
            <FileVideo className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-mono font-semibold text-gray-800">
            {workflowType === 'complete' && 'Image to Video Workflow'}
            {workflowType === 'image-only' && 'Image Generation Workflow'}
            {workflowType === 'video-from-image' && 'Video from Image Workflow'}
          </h2>
        </div>
        <p className="text-gray-600 font-mono text-sm">
          {workflowType === 'complete' && 'Complete pipeline: text prompt → AI image → animated video'}
          {workflowType === 'image-only' && 'Create stunning images with DALL-E 3'}
          {workflowType === 'video-from-image' && 'Transform your images into animated videos'}
        </p>
        <div className="flex items-center justify-center gap-6 mt-3">
          <Badge className="bg-black text-white font-mono text-xs">
            {totalCost} credits total
          </Badge>
          <Badge variant="outline" className="font-mono text-xs">
            ~{totalTime} estimated
          </Badge>
        </div>
      </div>

      {/* Grille des étapes */}
      <div className="relative">
        {/* Ligne de connexion verticale */}
        <div className="absolute left-6 top-12 bottom-12 w-0.5 bg-gradient-to-b from-gray-200 via-gray-300 to-gray-200"></div>
        
        <div className="space-y-6">
          {steps.map((step, index) => (
            <div key={step.id} className="relative">
              {/* Numéro de l'étape */}
              <div className={`absolute left-4 w-8 h-8 rounded-full flex items-center justify-center z-10 ${getStepNumberBg(step.status)}`}>
                {getStepNumber(index, step.status)}
              </div>

              {/* Carte de l'étape */}
              <Card 
                className={`ml-16 transition-all duration-300 cursor-pointer hover:shadow-lg ${getStatusColor(step.status)}`}
                onClick={() => onStepClick?.(step.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <step.icon className="w-5 h-5 text-gray-700" />
                        <h3 className="font-mono font-semibold text-gray-800">
                          {step.title}
                        </h3>
                        {step.status === 'active' && (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <span className="text-xs text-blue-600 font-mono">running</span>
                          </div>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 font-mono mb-3">
                        {step.description}
                      </p>

                      <div className="flex items-center gap-4 text-xs font-mono text-gray-500">
                        {step.estimatedTime && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{step.estimatedTime}</span>
                          </div>
                        )}
                        {step.provider && (
                          <div className="flex items-center gap-1">
                            <Settings className="w-3 h-3" />
                            <span>{step.provider}</span>
                          </div>
                        )}
                        {step.cost !== undefined && step.cost > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {step.cost} credits
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="ml-4">
                      {getStatusIcon(step.status)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Flèche de connexion */}
              {index < steps.length - 1 && (
                <div className="absolute left-6 -bottom-3 transform -translate-x-1/2 z-10">
                  <ArrowDown className="w-4 h-4 text-gray-400" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Pied de page avec résumé */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between text-sm font-mono">
          <div className="flex items-center gap-4">
            <span className="text-gray-600">
              {steps.filter(s => s.status === 'completed').length}/{steps.length} steps completed
            </span>
            <span className="text-gray-600">•</span>
            <span className="text-gray-600">Total cost: {totalCost} credits</span>
          </div>
          <div className="flex items-center gap-2">
            <Play className="w-3 h-3 text-gray-500" />
            <span className="text-gray-500">Ready to start</span>
          </div>
        </div>
      </div>
    </div>
  );
}