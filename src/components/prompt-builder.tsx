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
  Wand2, 
  Sparkles, 
  History, 
  Save,
  ChevronDown,
  ChevronUp,
  Palette,
  Camera,
  Lightbulb,
  Hash,
  Info
} from 'lucide-react';

// Style presets
const STYLE_CATEGORIES = {
  portrait: { label: 'Portrait', icon: '👤', keywords: 'portrait, face, person, headshot' },
  landscape: { label: 'Landscape', icon: '🏞️', keywords: 'landscape, nature, scenery, outdoor' },
  abstract: { label: 'Abstract', icon: '🎨', keywords: 'abstract, artistic, creative, conceptual' },
  photography: { label: 'Photography', icon: '📸', keywords: 'photographic, realistic, camera, lens' },
  illustration: { label: 'Illustration', icon: '✏️', keywords: 'illustration, drawing, artwork, sketch' },
  '3d': { label: '3D Render', icon: '🎮', keywords: '3d render, CGI, digital, volumetric' },
};

const MOOD_MODIFIERS = {
  bright: { label: 'Bright', keywords: 'bright, luminous, vibrant, radiant' },
  dark: { label: 'Dark', keywords: 'dark, moody, dramatic, noir' },
  colorful: { label: 'Colorful', keywords: 'colorful, vivid, saturated, rainbow' },
  minimal: { label: 'Minimal', keywords: 'minimal, simple, clean, white space' },
  dramatic: { label: 'Dramatic', keywords: 'dramatic, intense, powerful, epic' },
  soft: { label: 'Soft', keywords: 'soft, gentle, pastel, delicate' },
};

const ART_STYLES = {
  realistic: 'Photorealistic, hyper-detailed',
  cartoon: 'Cartoon style, animated, playful',
  anime: 'Anime style, Japanese animation',
  impressionist: 'Impressionist painting, brushstrokes',
  cyberpunk: 'Cyberpunk, neon, futuristic, tech noir',
  steampunk: 'Steampunk, Victorian, brass, gears',
  watercolor: 'Watercolor painting, soft edges',
  oil: 'Oil painting, classical, rich textures',
  pencil: 'Pencil drawing, sketch, graphite',
  digital: 'Digital art, modern, clean lines',
};

const COMPOSITION_ELEMENTS = {
  'rule-of-thirds': 'Rule of thirds composition',
  'symmetrical': 'Symmetrical, balanced, centered',
  'low-angle': 'Low angle shot, looking up',
  'high-angle': 'High angle shot, looking down',
  'close-up': 'Close-up, macro, detailed',
  'wide-shot': 'Wide shot, establishing, panoramic',
  'depth': 'Deep depth of field, layered',
  'bokeh': 'Shallow depth of field, bokeh background',
};

// Prompt templates
const PROMPT_TEMPLATES = {
  business: {
    name: 'Business Professional',
    template: 'A professional {subject} in a modern office environment, {mood} lighting, corporate setting',
    variables: ['subject', 'mood'],
  },
  product: {
    name: 'Product Shot',
    template: '{product} on a {background} background, studio lighting, commercial photography, high quality',
    variables: ['product', 'background'],
  },
  nature: {
    name: 'Nature Scene',
    template: 'A {time} scene of {location}, {weather} weather, {style} style, natural lighting',
    variables: ['time', 'location', 'weather', 'style'],
  },
  character: {
    name: 'Character Design',
    template: 'A {age} {gender} character, {clothing}, {expression} expression, {style} art style, {background}',
    variables: ['age', 'gender', 'clothing', 'expression', 'style', 'background'],
  },
  abstract: {
    name: 'Abstract Art',
    template: 'Abstract {colors} composition, {texture} textures, {mood} mood, {movement} movement',
    variables: ['colors', 'texture', 'mood', 'movement'],
  },
};

interface PromptBuilderProps {
  value: string;
  onChange: (value: string) => void;
  onEnhanceToggle?: (enabled: boolean) => void;
  enhanceEnabled?: boolean;
  className?: string;
}

export function PromptBuilder({ 
  value, 
  onChange, 
  onEnhanceToggle,
  enhanceEnabled = true,
  className 
}: PromptBuilderProps) {
  const [mode, setMode] = useState<'simple' | 'guided' | 'expert'>('simple');
  const [expanded, setExpanded] = useState(false);
  
  // Advanced settings
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [selectedArtStyle, setSelectedArtStyle] = useState<string>('');
  const [selectedComposition, setSelectedComposition] = useState<string>('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [creativity, setCreativity] = useState([0.7]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({});
  
  // History
  const [promptHistory, setPromptHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load history from localStorage
  useEffect(() => {
    const history = localStorage.getItem('prompt-history');
    if (history) {
      setPromptHistory(JSON.parse(history));
    }
  }, []);

  // Save to history
  const saveToHistory = (prompt: string) => {
    if (!prompt.trim()) return;
    const newHistory = [prompt, ...promptHistory.filter(p => p !== prompt)].slice(0, 10);
    setPromptHistory(newHistory);
    localStorage.setItem('prompt-history', JSON.stringify(newHistory));
  };

  // Build prompt from guided mode
  const buildGuidedPrompt = () => {
    const parts = [value];
    
    if (selectedCategory) {
      const category = STYLE_CATEGORIES[selectedCategory as keyof typeof STYLE_CATEGORIES];
      if (category) parts.push(category.keywords.split(',')[0]);
    }
    
    if (selectedMood) {
      const mood = MOOD_MODIFIERS[selectedMood as keyof typeof MOOD_MODIFIERS];
      if (mood) parts.push(mood.keywords.split(',')[0]);
    }
    
    if (selectedArtStyle) {
      parts.push(ART_STYLES[selectedArtStyle as keyof typeof ART_STYLES]);
    }
    
    if (selectedComposition) {
      parts.push(COMPOSITION_ELEMENTS[selectedComposition as keyof typeof COMPOSITION_ELEMENTS]);
    }
    
    return parts.filter(Boolean).join(', ');
  };

  // Apply template
  const applyTemplate = (templateKey: string) => {
    const template = PROMPT_TEMPLATES[templateKey as keyof typeof PROMPT_TEMPLATES];
    if (!template) return;
    
    let prompt = template.template;
    Object.entries(templateVars).forEach(([key, value]) => {
      prompt = prompt.replace(`{${key}}`, value);
    });
    
    // Replace any remaining variables with placeholders
    template.variables.forEach(v => {
      if (!templateVars[v]) {
        prompt = prompt.replace(`{${v}}`, `[${v}]`);
      }
    });
    
    onChange(prompt);
  };

  const characterCount = value.length;
  const isValidLength = characterCount >= 10 && characterCount <= 1000;

  return (
    <Card className={`bg-card border-border ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-mono text-sm text-white">
            <Wand2 className="w-4 h-4" />
            prompt_builder
          </CardTitle>
          <div className="flex items-center gap-2">
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
      <CardContent className="space-y-3">
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

        {/* Main Prompt Input */}
        <div>
          <Label className="font-mono text-xs text-white mb-1 block">
            {mode === 'simple' ? 'prompt' : 'base_prompt'}
          </Label>
          <Textarea
            placeholder="Describe what you want to generate..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="min-h-[80px] bg-white border-border text-black font-mono text-xs"
            maxLength={1000}
          />
        </div>

        {/* Quick Templates */}
        {mode !== 'simple' && (
          <div>
            <Label className="font-mono text-xs text-muted-foreground mb-1 block">templates</Label>
            <Select value={selectedTemplate} onValueChange={(v) => {
              setSelectedTemplate(v);
              applyTemplate(v);
            }}>
              <SelectTrigger className="bg-white border-border text-black font-mono text-xs">
                <SelectValue placeholder="Choose a template..." />
              </SelectTrigger>
              <SelectContent className="bg-black border-white/20 shadow-lg">
                {Object.entries(PROMPT_TEMPLATES).map(([key, template]) => (
                  <SelectItem key={key} value={key} className="font-mono text-xs text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer">
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Guided Mode Controls */}
        {mode === 'guided' && expanded && (
          <div className="space-y-3 border-t border-border pt-3">
            {/* Style Category */}
            <div>
              <Label className="font-mono text-xs text-muted-foreground mb-2 block">style_category</Label>
              <div className="grid grid-cols-3 gap-1">
                {Object.entries(STYLE_CATEGORIES).map(([key, style]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedCategory(key === selectedCategory ? '' : key);
                      onChange(buildGuidedPrompt());
                    }}
                    className={`p-2 text-xs border transition-colors ${
                      selectedCategory === key 
                        ? 'border-white bg-white/10 text-white' 
                        : 'border-border hover:border-white/20 text-muted-foreground'
                    }`}
                  >
                    <div className="text-lg mb-1">{style.icon}</div>
                    <div className="font-mono">{style.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Mood */}
            <div>
              <Label className="font-mono text-xs text-muted-foreground mb-2 block">mood</Label>
              <div className="flex flex-wrap gap-1">
                {Object.entries(MOOD_MODIFIERS).map(([key, mood]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedMood(key === selectedMood ? '' : key);
                      onChange(buildGuidedPrompt());
                    }}
                    className={`px-2 py-1 text-xs font-mono border transition-colors ${
                      selectedMood === key 
                        ? 'border-white bg-white text-black' 
                        : 'border-border hover:border-white/20 text-muted-foreground'
                    }`}
                  >
                    {mood.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Art Style */}
            <div>
              <Label className="font-mono text-xs text-muted-foreground mb-1 block">art_style</Label>
              <Select value={selectedArtStyle} onValueChange={(v) => {
                setSelectedArtStyle(v);
                onChange(buildGuidedPrompt());
              }}>
                <SelectTrigger className="bg-white border-border text-black font-mono text-xs">
                  <SelectValue placeholder="Select art style..." />
                </SelectTrigger>
                <SelectContent className="bg-black border-white/20 shadow-lg">
                  {Object.entries(ART_STYLES).map(([key, style]) => (
                    <SelectItem key={key} value={key} className="font-mono text-xs text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer">
                      {key} - {style}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Expert Mode Controls */}
        {mode === 'expert' && expanded && (
          <div className="space-y-3 border-t border-border pt-3">
            {/* Negative Prompt */}
            <div>
              <Label className="font-mono text-xs text-muted-foreground mb-1 block">
                negative_prompt
                <span className="ml-1 text-xs opacity-50">(what to avoid)</span>
              </Label>
              <Textarea
                placeholder="blur, low quality, distorted, ugly..."
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                className="min-h-[40px] bg-white border-border text-black font-mono text-xs"
                maxLength={500}
              />
            </div>

            {/* Creativity Temperature */}
            <div>
              <Label className="font-mono text-xs text-muted-foreground mb-2 block">
                gpt_creativity: {creativity[0].toFixed(1)}
              </Label>
              <Slider
                value={creativity}
                onValueChange={setCreativity}
                min={0.3}
                max={1.0}
                step={0.1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>precise</span>
                <span>creative</span>
              </div>
            </div>

            {/* Composition */}
            <div>
              <Label className="font-mono text-xs text-muted-foreground mb-1 block">composition</Label>
              <Select value={selectedComposition} onValueChange={setSelectedComposition}>
                <SelectTrigger className="bg-white border-border text-black font-mono text-xs">
                  <SelectValue placeholder="Select composition..." />
                </SelectTrigger>
                <SelectContent className="bg-black border-white/20 shadow-lg">
                  {Object.entries(COMPOSITION_ELEMENTS).map(([key, comp]) => (
                    <SelectItem key={key} value={key} className="font-mono text-xs text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer">
                      {comp}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* GPT Enhancement Toggle */}
        <div className="flex items-center justify-between p-2 bg-secondary/50 rounded">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-white" />
            <Label className="font-mono text-xs text-white cursor-pointer">
              gpt_enhancement
            </Label>
          </div>
          <Switch
            checked={enhanceEnabled}
            onCheckedChange={onEnhanceToggle}
            className="data-[state=checked]:bg-white"
          />
        </div>

        {/* History */}
        {promptHistory.length > 0 && (
          <div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-white font-mono transition-colors"
            >
              <History className="w-3 h-3" />
              recent_prompts ({promptHistory.length})
            </button>
            
            {showHistory && (
              <div className="mt-2 space-y-1">
                {promptHistory.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => onChange(prompt)}
                    className="w-full text-left p-2 text-xs font-mono bg-secondary/50 hover:bg-secondary border border-border hover:border-white/20 transition-colors truncate"
                  >
                    {prompt}
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
              setNegativePrompt('');
              setSelectedCategory('');
              setSelectedMood('');
              setSelectedArtStyle('');
              setSelectedComposition('');
            }}
            className="flex-1 h-7 font-mono text-xs"
          >
            clear
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}