'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Video, 
  Image as ImageIcon, 
  ArrowRight, 
  Clock,
  CreditCard,
  Sparkles,
  Upload,
  Type,
  Zap
} from 'lucide-react';

export type WorkflowType = 'text-to-video' | 'text-to-image' | 'image-to-video';

export interface WorkflowTemplate {
  id: WorkflowType;
  name: string;
  description: string;
  detailedDescription: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  estimatedCost: string;
  estimatedDuration: string;
  steps: string[];
  tags: string[];
}

const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'text-to-video',
    name: 'Text-to-Video',
    description: 'Generate videos directly from text descriptions',
    detailedDescription: 'Transform your written ideas into dynamic videos using advanced AI. Perfect for creating promotional content, storytelling, or visual narratives from scratch.',
    icon: Video,
    accentColor: '#EF4444', // Rouge
    estimatedCost: '15-20 credits',
    estimatedDuration: '2-4 min',
    steps: ['text_prompt', 'gpt_enhance', 'video_generation', 'final_output'],
    tags: ['NEW', 'FAST']
  },
  {
    id: 'text-to-image',
    name: 'Text-to-Image',
    description: 'Create stunning images from text prompts',
    detailedDescription: 'Generate high-quality images using DALL-E 3. Ideal for creating artwork, illustrations, concepts, or visual assets from detailed text descriptions.',
    icon: ImageIcon,
    accentColor: '#10B981', // Vert
    estimatedCost: '5-8 credits',
    estimatedDuration: '30-60s',
    steps: ['text_prompt', 'gpt_enhance', 'dalle_generation', 'final_output'],
    tags: ['POPULAR', 'CREATIVE']
  },
  {
    id: 'image-to-video',
    name: 'Image-to-Video',
    description: 'Animate existing images into videos',
    detailedDescription: 'Bring your static images to life with natural movement and animation. Upload an image and add motion prompts to create engaging video content.',
    icon: ArrowRight,
    accentColor: '#3B82F6', // Bleu
    estimatedCost: '15-20 credits',
    estimatedDuration: '1-3 min',
    steps: ['image_upload', 'motion_prompt', 'video_generation', 'final_output'],
    tags: ['PROVEN']
  }
];

interface WorkflowTypeSelectorProps {
  selectedType?: WorkflowType | null;
  onSelect: (type: WorkflowType) => void;
  onContinue?: () => void;
  className?: string;
}

export function WorkflowTypeSelector({ 
  selectedType, 
  onSelect, 
  onContinue,
  className 
}: WorkflowTypeSelectorProps) {
  const [hoveredType, setHoveredType] = useState<WorkflowType | null>(null);

  const handleCardClick = (type: WorkflowType) => {
    onSelect(type);
  };

  const getCardClasses = (template: WorkflowTemplate) => {
    const isSelected = selectedType === template.id;
    const isHovered = hoveredType === template.id;
    
    return `
      relative cursor-pointer transition-all duration-300 ease-out transform 
      bg-[#1A1A1A] border-2 overflow-hidden group
      ${isSelected 
        ? `border-[${template.accentColor}] shadow-lg shadow-[${template.accentColor}]/20 scale-105` 
        : 'border-[#333333] hover:border-[#666666]'
      }
      ${isHovered && !isSelected 
        ? `hover:shadow-lg hover:shadow-[${template.accentColor}]/10 hover:scale-102` 
        : ''
      }
      hover:bg-[#1F1F1F]
    `;
  };

  const getIconClasses = (template: WorkflowTemplate) => {
    const isSelected = selectedType === template.id;
    return `w-8 h-8 transition-colors duration-300 ${
      isSelected ? `text-[${template.accentColor}]` : 'text-gray-400 group-hover:text-white'
    }`;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center space-y-3 animate-slide-in">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-white" />
          <h2 className="font-mono text-xl text-white">choose_workflow_type</h2>
        </div>
        <p className="text-muted-foreground font-mono text-sm max-w-2xl mx-auto">
          Select the type of content generation workflow that matches your creative needs
        </p>
      </div>

      {/* Workflow Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {WORKFLOW_TEMPLATES.map((template, index) => {
          const IconComponent = template.icon;
          const isSelected = selectedType === template.id;
          
          return (
            <Card 
              key={template.id}
              className={getCardClasses(template)}
              onMouseEnter={() => setHoveredType(template.id)}
              onMouseLeave={() => setHoveredType(null)}
              onClick={() => handleCardClick(template.id)}
              style={{
                animationDelay: `${index * 100}ms`
              }}
            >
              {/* Gradient Overlay - Only visible when selected */}
              {isSelected && (
                <div 
                  className="absolute inset-0 opacity-5"
                  style={{
                    background: `linear-gradient(135deg, ${template.accentColor}20 0%, transparent 50%)`
                  }}
                />
              )}

              <div className="relative p-6 h-full flex flex-col">
                {/* Header avec icône et badges */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg border ${
                      isSelected 
                        ? `bg-[${template.accentColor}]/10 border-[${template.accentColor}]/30` 
                        : 'bg-[#0A0A0A] border-[#333333] group-hover:border-[#666666]'
                    } transition-all duration-300`}>
                      <IconComponent className={getIconClasses(template)} />
                    </div>
                    <div>
                      <h3 className="font-mono text-lg text-white font-medium">
                        {template.name}
                      </h3>
                      <div className="flex gap-1 mt-1">
                        {template.tags.map((tag) => (
                          <Badge 
                            key={tag}
                            className={`font-mono text-xs px-2 py-0.5 ${
                              tag === 'NEW' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                              tag === 'POPULAR' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                              tag === 'FAST' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                              tag === 'PROVEN' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                              'bg-gray-500/20 text-gray-400 border-gray-500/30'
                            }`}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Selection indicator */}
                  {isSelected && (
                    <div 
                      className="w-3 h-3 rounded-full animate-pulse"
                      style={{ backgroundColor: template.accentColor }}
                    />
                  )}
                </div>

                {/* Description */}
                <div className="flex-1 mb-4">
                  <p className="text-gray-300 font-mono text-sm mb-3 leading-relaxed">
                    {template.description}
                  </p>
                  <p className="text-gray-400 font-mono text-xs leading-relaxed">
                    {template.detailedDescription}
                  </p>
                </div>

                {/* Workflow Steps */}
                <div className="mb-4">
                  <div className="text-xs font-mono text-gray-400 mb-2">pipeline_steps:</div>
                  <div className="flex flex-wrap gap-1">
                    {template.steps.map((step, idx) => (
                      <span key={idx} className="flex items-center">
                        <span className="text-xs font-mono text-gray-500 bg-[#0A0A0A] border border-[#333333] px-2 py-1 rounded">
                          {step}
                        </span>
                        {idx < template.steps.length - 1 && (
                          <ArrowRight className="w-3 h-3 text-gray-600 mx-1" />
                        )}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Cost & Duration */}
                <div className="flex items-center justify-between pt-3 border-t border-[#333333]">
                  <div className="flex items-center gap-3 text-xs font-mono text-gray-400">
                    <div className="flex items-center gap-1">
                      <CreditCard className="w-3 h-3" />
                      <span>{template.estimatedCost}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{template.estimatedDuration}</span>
                    </div>
                  </div>
                  
                  {isSelected && (
                    <Badge className="bg-green-500 text-white font-mono text-xs px-2 py-1">
                      selected
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Continue Button */}
      {selectedType && onContinue && (
        <div className="text-center animate-slide-in">
          <Button
            onClick={onContinue}
            className="bg-white hover:bg-white/90 text-black font-mono text-sm h-10 px-8 hover:scale-105 transition-all duration-200 shadow-lg"
          >
            <Zap className="w-4 h-4 mr-2" />
            continue_to_configuration
          </Button>
        </div>
      )}

      {/* Help text */}
      {!selectedType && (
        <div className="text-center">
          <p className="text-muted-foreground font-mono text-xs opacity-75">
            💡 select a workflow type above to begin content creation
          </p>
        </div>
      )}
    </div>
  );
}