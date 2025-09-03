'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Video, 
  Play, 
  Camera, 
  Sparkles, 
  History, 
  Save,
  ChevronDown,
  ChevronUp,
  Wand2,
  Clock,
  Move,
  Palette,
  Settings,
  Zap,
  Eye
} from 'lucide-react';

// Video-specific templates with categories
export const VIDEO_TEMPLATE_CATEGORIES = {
  marketing: {
    label: 'Marketing/Ads',
    icon: '📢',
    templates: {
      product_showcase: {
        name: 'Product Showcase',
        description: 'Professional product presentation with smooth movements',
        template: 'A {{product}} elegantly displayed on {{background}}, smooth 360° rotation, professional lighting, {{brand_colors}} color scheme, clean and premium feel',
        variables: ['product', 'background', 'brand_colors'],
        motion: {
          cameraMovement: 'smooth-orbit',
          objectMotion: ['rotation', 'subtle-float'],
          transitionType: 'fade',
          duration: 8
        }
      },
      brand_story: {
        name: 'Brand Story',
        description: 'Emotional brand narrative with dynamic transitions',
        template: '{{scene_description}}, emotional storytelling, {{brand_personality}} atmosphere, dynamic camera movements, inspiring music sync',
        variables: ['scene_description', 'brand_personality'],
        motion: {
          cameraMovement: 'cinematic-pan',
          objectMotion: ['gentle-movement'],
          transitionType: 'crossfade',
          duration: 8
        }
      }
    }
  },
  creative: {
    label: 'Creative/Artistic',
    icon: '🎨',
    templates: {
      abstract_art: {
        name: 'Abstract Motion',
        description: 'Fluid abstract patterns with hypnotic movement',
        template: 'Abstract {{color_palette}} patterns, fluid motion graphics, {{texture}} textures, hypnotic transitions, {{mood}} atmosphere',
        variables: ['color_palette', 'texture', 'mood'],
        motion: {
          cameraMovement: 'flowing',
          objectMotion: ['morphing', 'fluid-motion'],
          transitionType: 'morph',
          duration: 8
        }
      },
      nature_scene: {
        name: 'Nature Scene',
        description: 'Serene natural environments with organic movement',
        template: '{{landscape_type}} with {{weather}} conditions, natural organic movement, {{time_of_day}} lighting, peaceful atmosphere',
        variables: ['landscape_type', 'weather', 'time_of_day'],
        motion: {
          cameraMovement: 'gentle-drift',
          objectMotion: ['natural-sway', 'organic-flow'],
          transitionType: 'fade',
          duration: 8
        }
      }
    }
  },
  educational: {
    label: 'Educational',
    icon: '📚',
    templates: {
      tutorial_demo: {
        name: 'Tutorial Demo',
        description: 'Step-by-step demonstration with clear focus',
        template: 'Step-by-step demonstration of {{process}}, clear focus on details, {{highlight_color}} highlights, instructional pacing',
        variables: ['process', 'highlight_color'],
        motion: {
          cameraMovement: 'focus-shift',
          objectMotion: ['step-by-step'],
          transitionType: 'cut',
          duration: 8
        }
      },
      concept_visualization: {
        name: 'Concept Visualization',
        description: 'Abstract concepts made visual with smooth transitions',
        template: 'Visual representation of {{concept}}, {{visualization_style}} style, smooth transitions between ideas, educational clarity',
        variables: ['concept', 'visualization_style'],
        motion: {
          cameraMovement: 'reveal',
          objectMotion: ['build-up', 'reveal'],
          transitionType: 'slide',
          duration: 8
        }
      }
    }
  },
  entertainment: {
    label: 'Entertainment',
    icon: '🎬',
    templates: {
      character_action: {
        name: 'Character Action',
        description: 'Dynamic character movements and expressions',
        template: '{{character}} performing {{action}}, dynamic expressions, {{style}} animation style, engaging personality',
        variables: ['character', 'action', 'style'],
        motion: {
          cameraMovement: 'dynamic',
          objectMotion: ['character-animation', 'expressions'],
          transitionType: 'impact',
          duration: 8
        }
      },
      cinematic_scene: {
        name: 'Cinematic Scene',
        description: 'Movie-like scenes with professional cinematography',
        template: 'Cinematic {{scene_type}} scene, {{mood}} atmosphere, professional cinematography, {{lighting_style}} lighting',
        variables: ['scene_type', 'mood', 'lighting_style'],
        motion: {
          cameraMovement: 'cinematic',
          objectMotion: ['dramatic-movement'],
          transitionType: 'cinematic',
          duration: 8
        }
      }
    }
  }
};

// Motion and camera movement options
export const CAMERA_MOVEMENTS = {
  'static': 'Static - No camera movement',
  'smooth-orbit': 'Smooth Orbit - 360° rotation around subject',
  'cinematic-pan': 'Cinematic Pan - Horizontal sweep',
  'gentle-drift': 'Gentle Drift - Slow floating movement',
  'focus-shift': 'Focus Shift - Rack focus between elements',
  'reveal': 'Reveal - Gradual unveiling',
  'dynamic': 'Dynamic - Multiple movement types',
  'cinematic': 'Cinematic - Professional film-style movement',
  'flowing': 'Flowing - Continuous fluid motion'
};

export const OBJECT_MOTIONS = {
  'subtle-breathing': 'Subtle Breathing - Natural life-like motion',
  'rotation': 'Rotation - Object spinning/rotating',
  'subtle-float': 'Subtle Float - Gentle up and down movement',
  'gentle-movement': 'Gentle Movement - Soft, natural motion',
  'morphing': 'Morphing - Shape transformation',
  'fluid-motion': 'Fluid Motion - Liquid-like movement',
  'natural-sway': 'Natural Sway - Organic swaying motion',
  'organic-flow': 'Organic Flow - Natural flowing patterns',
  'step-by-step': 'Step by Step - Sequential movement',
  'build-up': 'Build Up - Progressive construction',
  'reveal': 'Reveal - Gradual appearance',
  'character-animation': 'Character Animation - Personality-driven motion',
  'expressions': 'Expressions - Facial/emotional changes',
  'dramatic-movement': 'Dramatic Movement - Bold, impactful motion'
};

export const TRANSITION_TYPES = {
  'fade': 'Fade - Gentle fade in/out',
  'crossfade': 'Crossfade - Smooth blend between states',
  'morph': 'Morph - Shape transformation',
  'cut': 'Cut - Sharp instant change',
  'slide': 'Slide - Sliding transition',
  'impact': 'Impact - Dramatic change',
  'cinematic': 'Cinematic - Film-style transition'
};

export const VIDEO_MOODS = {
  'energetic': 'Energetic - High energy, vibrant',
  'calm': 'Calm - Peaceful, serene',
  'dramatic': 'Dramatic - Intense, powerful',
  'playful': 'Playful - Fun, lighthearted',
  'professional': 'Professional - Clean, business-like',
  'mysterious': 'Mysterious - Intriguing, enigmatic',
  'romantic': 'Romantic - Soft, emotional',
  'epic': 'Epic - Grand, cinematic'
};

interface VideoPromptSettings {
  mainDescription: string;
  motion: {
    cameraMovement: string;
    objectMotion: string[];
    transitionType: string;
  };
  mood: string[];
  duration: number;
  variables: Record<string, string>;
  template?: string;
}

interface VideoPromptBuilderProps {
  value: string;
  onChange: (value: string) => void;
  onSettingsChange?: (settings: VideoPromptSettings) => void;
  onEnhanceToggle?: (enabled: boolean) => void;
  enhanceEnabled?: boolean;
  className?: string;
}

export function VideoPromptBuilder({ 
  value, 
  onChange, 
  onSettingsChange,
  onEnhanceToggle,
  enhanceEnabled = true,
  className 
}: VideoPromptBuilderProps) {
  const [mode, setMode] = useState<'simple' | 'guided' | 'expert'>('guided');
  const [expanded, setExpanded] = useState(true);
  
  // Video-specific settings
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({});
  const [cameraMovement, setCameraMovement] = useState<string>('smooth-orbit');
  const [selectedMotions, setSelectedMotions] = useState<string[]>(['subtle-breathing']);
  const [transitionType, setTransitionType] = useState<string>('fade');
  const [selectedMoods, setSelectedMoods] = useState<string[]>(['professional']);
  const [duration] = useState(8); // Fixed at 8s for Veo3
  
  // History
  const [promptHistory, setPromptHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load history from localStorage
  useEffect(() => {
    const history = localStorage.getItem('video-prompt-history');
    if (history) {
      setPromptHistory(JSON.parse(history));
    }
  }, []);

  // Update parent with settings
  useEffect(() => {
    if (onSettingsChange) {
      onSettingsChange({
        mainDescription: value,
        motion: {
          cameraMovement,
          objectMotion: selectedMotions,
          transitionType
        },
        mood: selectedMoods,
        duration,
        variables: templateVars,
        template: selectedTemplate
      });
    }
  }, [value, cameraMovement, selectedMotions, transitionType, selectedMoods, duration, templateVars, selectedTemplate, onSettingsChange]);

  // Save to history
  const saveToHistory = (prompt: string) => {
    if (!prompt.trim()) return;
    const newHistory = [prompt, ...promptHistory.filter(p => p !== prompt)].slice(0, 10);
    setPromptHistory(newHistory);
    localStorage.setItem('video-prompt-history', JSON.stringify(newHistory));
  };

  // Apply template
  const applyTemplate = (categoryKey: string, templateKey: string) => {
    const category = VIDEO_TEMPLATE_CATEGORIES[categoryKey as keyof typeof VIDEO_TEMPLATE_CATEGORIES];
    if (!category) return;
    
    const template = category.templates[templateKey as keyof typeof category.templates];
    if (!template) return;

    setSelectedTemplate(templateKey);
    
    // Apply motion settings from template
    setCameraMovement(template.motion.cameraMovement);
    setSelectedMotions(template.motion.objectMotion);
    setTransitionType(template.motion.transitionType);
    
    // Build prompt with current variables
    let prompt = template.template;
    Object.entries(templateVars).forEach(([key, value]) => {
      if (value.trim()) {
        prompt = prompt.replace(`{{${key}}}`, value);
      }
    });
    
    onChange(prompt);
  };

  // Build enhanced prompt from current settings
  const buildEnhancedPrompt = () => {
    const parts = [value];
    
    // Add camera movement
    if (cameraMovement && cameraMovement !== 'static') {
      const movement = CAMERA_MOVEMENTS[cameraMovement as keyof typeof CAMERA_MOVEMENTS];
      if (movement) {
        parts.push(`camera: ${movement.split(' - ')[0].toLowerCase()}`);
      }
    }
    
    // Add object motions
    if (selectedMotions.length > 0) {
      const motions = selectedMotions.map(m => {
        const motion = OBJECT_MOTIONS[m as keyof typeof OBJECT_MOTIONS];
        return motion ? motion.split(' - ')[0].toLowerCase() : m;
      }).join(', ');
      parts.push(`motion: ${motions}`);
    }
    
    // Add transition
    if (transitionType && transitionType !== 'fade') {
      const transition = TRANSITION_TYPES[transitionType as keyof typeof TRANSITION_TYPES];
      if (transition) {
        parts.push(`transitions: ${transition.split(' - ')[0].toLowerCase()}`);
      }
    }
    
    // Add mood
    if (selectedMoods.length > 0) {
      parts.push(`mood: ${selectedMoods.join(', ')}`);
    }
    
    return parts.filter(Boolean).join(', ');
  };

  const characterCount = value.length;
  const isValidLength = characterCount >= 10 && characterCount <= 1000;

  return (
    <Card className={`bg-card border-border ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-mono text-sm text-white">
            <Video className="w-4 h-4" />
            video_prompt_builder
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className="bg-purple-500 text-white font-mono text-xs">
              {duration}s_veo3
            </Badge>
            <Badge 
              variant={isValidLength ? "default" : "destructive"} 
              className="font-mono text-xs"
            >
              {characterCount}/1000
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-6 w-6 p-0"
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode Selection */}
        <div className="flex gap-1 p-1 bg-secondary/50 rounded">
          {(['simple', 'guided', 'expert'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 px-2 py-1 text-xs font-mono transition-colors ${
                mode === m 
                  ? 'bg-white text-black' 
                  : 'text-muted-foreground hover:text-white'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Template Categories */}
        {mode !== 'simple' && (
          <div className="space-y-3">
            <Label className="font-mono text-xs text-white">video_templates</Label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(VIDEO_TEMPLATE_CATEGORIES).map(([categoryKey, category]) => (
                <div key={categoryKey} className="space-y-2">
                  <button
                    onClick={() => setSelectedCategory(selectedCategory === categoryKey ? '' : categoryKey)}
                    className={`w-full p-2 text-left border transition-colors ${
                      selectedCategory === categoryKey 
                        ? 'border-white bg-white/10' 
                        : 'border-border hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{category.icon}</span>
                      <span className="font-mono text-xs text-white">{category.label}</span>
                    </div>
                  </button>
                  
                  {selectedCategory === categoryKey && (
                    <div className="space-y-1 ml-2">
                      {Object.entries(category.templates).map(([templateKey, template]) => (
                        <button
                          key={templateKey}
                          onClick={() => applyTemplate(categoryKey, templateKey)}
                          className="w-full p-2 text-left bg-secondary/50 hover:bg-secondary border border-border hover:border-white/20 transition-colors"
                        >
                          <div className="font-mono text-xs text-white mb-1">{template.name}</div>
                          <div className="font-mono text-xs text-muted-foreground">{template.description}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Prompt Input */}
        <div>
          <Label className="font-mono text-xs text-white mb-1 block">
            scene_description
          </Label>
          <Textarea
            placeholder="Describe the video scene, objects, and actions you want to generate..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="min-h-[100px] bg-white border-border text-black font-mono text-xs"
            maxLength={1000}
          />
        </div>

        {/* Template Variables */}
        {selectedTemplate && selectedCategory && (
          <div className="space-y-2">
            <Label className="font-mono text-xs text-muted-foreground">template_variables</Label>
            {(() => {
              const category = VIDEO_TEMPLATE_CATEGORIES[selectedCategory as keyof typeof VIDEO_TEMPLATE_CATEGORIES];
              const template = category?.templates[selectedTemplate as keyof typeof category.templates];
              return template?.variables.map((variable) => (
                <div key={variable}>
                  <Label className="font-mono text-xs text-muted-foreground">{variable}</Label>
                  <input
                    type="text"
                    placeholder={`Enter ${variable}...`}
                    value={templateVars[variable] || ''}
                    onChange={(e) => setTemplateVars(prev => ({
                      ...prev,
                      [variable]: e.target.value
                    }))}
                    className="w-full mt-1 px-2 py-1 bg-white border border-border text-black font-mono text-xs"
                  />
                </div>
              ));
            })()}
          </div>
        )}

        {expanded && (
          <div className="space-y-4 border-t border-border pt-4">
            {/* Motion Settings */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 font-mono text-xs text-white">
                <Move className="w-3 h-3" />
                motion_settings
              </Label>
              
              {/* Camera Movement */}
              <div>
                <Label className="font-mono text-xs text-muted-foreground mb-1 block">camera_movement</Label>
                <Select value={cameraMovement} onValueChange={setCameraMovement}>
                  <SelectTrigger className="bg-white border-border text-black font-mono text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-white/20 shadow-lg">
                    {Object.entries(CAMERA_MOVEMENTS).map(([key, desc]) => (
                      <SelectItem key={key} value={key} className="font-mono text-xs text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer">
                        {desc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Object Motion */}
              <div>
                <Label className="font-mono text-xs text-muted-foreground mb-2 block">object_motion</Label>
                <div className="grid grid-cols-2 gap-1">
                  {Object.entries(OBJECT_MOTIONS).map(([key, desc]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setSelectedMotions(prev => 
                          prev.includes(key) 
                            ? prev.filter(m => m !== key)
                            : [...prev, key]
                        );
                      }}
                      className={`p-2 text-xs border transition-colors ${
                        selectedMotions.includes(key) 
                          ? 'border-white bg-white/10 text-white' 
                          : 'border-border hover:border-white/20 text-muted-foreground'
                      }`}
                    >
                      <div className="font-mono">{desc.split(' - ')[0]}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Transitions */}
              <div>
                <Label className="font-mono text-xs text-muted-foreground mb-1 block">transition_type</Label>
                <Select value={transitionType} onValueChange={setTransitionType}>
                  <SelectTrigger className="bg-white border-border text-black font-mono text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-white/20 shadow-lg">
                    {Object.entries(TRANSITION_TYPES).map(([key, desc]) => (
                      <SelectItem key={key} value={key} className="font-mono text-xs text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer">
                        {desc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Mood Settings */}
            <div>
              <Label className="font-mono text-xs text-muted-foreground mb-2 block">mood_&_atmosphere</Label>
              <div className="flex flex-wrap gap-1">
                {Object.entries(VIDEO_MOODS).map(([key, desc]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedMoods(prev => 
                        prev.includes(key) 
                          ? prev.filter(m => m !== key)
                          : [...prev, key]
                      );
                    }}
                    className={`px-2 py-1 text-xs font-mono border transition-colors ${
                      selectedMoods.includes(key) 
                        ? 'border-white bg-white text-black' 
                        : 'border-border hover:border-white/20 text-muted-foreground'
                    }`}
                  >
                    {desc.split(' - ')[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* GPT Enhancement Toggle */}
        <div className="flex items-center justify-between p-2 bg-secondary/50 rounded">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-white" />
            <Label className="font-mono text-xs text-white cursor-pointer">
              gpt_video_enhancement
            </Label>
          </div>
          <Switch
            checked={enhanceEnabled}
            onCheckedChange={onEnhanceToggle}
            className="data-[state=checked]:bg-white"
          />
        </div>

        {/* Enhanced Preview */}
        {mode === 'expert' && (
          <div className="p-2 bg-secondary/30 border border-border rounded">
            <Label className="font-mono text-xs text-white mb-2 block">enhanced_prompt_preview:</Label>
            <div className="text-xs font-mono text-muted-foreground italic">
              "{buildEnhancedPrompt()}"
            </div>
          </div>
        )}

        {/* History */}
        {promptHistory.length > 0 && (
          <div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-white font-mono transition-colors"
            >
              <History className="w-3 h-3" />
              video_prompt_history ({promptHistory.length})
            </button>
            
            {showHistory && (
              <div className="mt-2 space-y-1">
                {promptHistory.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => onChange(prompt)}
                    className="w-full text-left p-2 text-xs font-mono bg-secondary/50 hover:bg-secondary border border-border hover:border-white/20 transition-colors"
                  >
                    <div className="truncate">{prompt}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => saveToHistory(value)}
            disabled={!value.trim()}
            className="flex-1 h-7 font-mono text-xs"
          >
            <Save className="w-3 h-3 mr-1" />
            save
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onChange('');
              setTemplateVars({});
              setSelectedCategory('');
              setSelectedTemplate('');
              setCameraMovement('smooth-orbit');
              setSelectedMotions(['subtle-breathing']);
              setTransitionType('fade');
              setSelectedMoods(['professional']);
            }}
            className="flex-1 h-7 font-mono text-xs"
          >
            clear
          </Button>
          <Button
            variant="outline" 
            size="sm"
            onClick={() => onChange(buildEnhancedPrompt())}
            disabled={!value.trim()}
            className="flex-1 h-7 font-mono text-xs"
          >
            <Eye className="w-3 h-3 mr-1" />
            apply
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}