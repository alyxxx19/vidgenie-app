export interface VideoTemplate {
  id: string;
  name: string;
  description: string;
  category: 'marketing' | 'creative' | 'educational' | 'entertainment';
  template: string;
  variables: string[];
  motion: {
    cameraMovement: string;
    objectMotion: string[];
    transitionType: string;
    duration: number;
  };
  mood: string[];
  tags: string[];
  isPublic: boolean;
  usageCount?: number;
}

export const VIDEO_TEMPLATES: VideoTemplate[] = [
  // Marketing Templates
  {
    id: 'product-showcase-360',
    name: 'Product Showcase 360°',
    description: 'Professional 360° product presentation with elegant rotation and premium lighting',
    category: 'marketing',
    template: 'A {{product}} elegantly displayed on {{background}} background, smooth 360° rotation revealing all angles, professional studio lighting, {{brand_colors}} color scheme, premium and sophisticated atmosphere',
    variables: ['product', 'background', 'brand_colors'],
    motion: {
      cameraMovement: 'smooth-orbit',
      objectMotion: ['rotation', 'subtle-float'],
      transitionType: 'fade',
      duration: 8
    },
    mood: ['professional', 'elegant'],
    tags: ['product', 'showcase', '360', 'professional', 'premium'],
    isPublic: true
  },
  {
    id: 'brand-story-emotional',
    name: 'Brand Story Emotional',
    description: 'Emotional brand narrative with cinematic camera work and inspiring atmosphere',
    category: 'marketing',
    template: '{{scene_description}}, emotional storytelling atmosphere, {{brand_personality}} brand personality, cinematic camera movements, inspiring and uplifting mood, {{brand_colors}} color palette',
    variables: ['scene_description', 'brand_personality', 'brand_colors'],
    motion: {
      cameraMovement: 'cinematic-pan',
      objectMotion: ['gentle-movement', 'natural-sway'],
      transitionType: 'crossfade',
      duration: 8
    },
    mood: ['emotional', 'inspiring', 'cinematic'],
    tags: ['brand', 'story', 'emotional', 'cinematic', 'inspiring'],
    isPublic: true
  },
  {
    id: 'social-media-hook',
    name: 'Social Media Hook',
    description: 'Attention-grabbing opening sequence designed for social media engagement',
    category: 'marketing',
    template: '{{hook_element}} with dramatic reveal, high-energy {{action}}, vibrant {{color_scheme}} colors, fast-paced and engaging, optimized for mobile viewing',
    variables: ['hook_element', 'action', 'color_scheme'],
    motion: {
      cameraMovement: 'dynamic',
      objectMotion: ['quick-reveal', 'energetic-bounce'],
      transitionType: 'impact',
      duration: 8
    },
    mood: ['energetic', 'dynamic', 'engaging'],
    tags: ['social-media', 'hook', 'engagement', 'mobile', 'viral'],
    isPublic: true
  },

  // Creative Templates
  {
    id: 'abstract-fluid-motion',
    name: 'Abstract Fluid Motion',
    description: 'Hypnotic fluid patterns with organic movement and smooth color transitions',
    category: 'creative',
    template: 'Abstract {{color_palette}} fluid patterns flowing organically, {{texture}} textures morphing smoothly, hypnotic and meditative movement, {{mood}} atmosphere',
    variables: ['color_palette', 'texture', 'mood'],
    motion: {
      cameraMovement: 'flowing',
      objectMotion: ['morphing', 'fluid-motion', 'organic-flow'],
      transitionType: 'morph',
      duration: 8
    },
    mood: ['mesmerizing', 'fluid', 'abstract'],
    tags: ['abstract', 'fluid', 'patterns', 'organic', 'hypnotic'],
    isPublic: true
  },
  {
    id: 'nature-zen-scene',
    name: 'Nature Zen Scene',
    description: 'Peaceful natural environment with gentle organic movements and serene atmosphere',
    category: 'creative',
    template: '{{landscape_type}} during {{time_of_day}}, {{weather}} weather conditions, gentle organic movement of natural elements, serene and peaceful atmosphere, soft natural lighting',
    variables: ['landscape_type', 'time_of_day', 'weather'],
    motion: {
      cameraMovement: 'gentle-drift',
      objectMotion: ['natural-sway', 'organic-flow', 'subtle-breathing'],
      transitionType: 'fade',
      duration: 8
    },
    mood: ['peaceful', 'serene', 'natural'],
    tags: ['nature', 'zen', 'peaceful', 'organic', 'meditation'],
    isPublic: true
  },
  {
    id: 'artistic-transformation',
    name: 'Artistic Transformation',
    description: 'Creative transformation sequence with artistic flair and dramatic reveals',
    category: 'creative',
    template: '{{starting_form}} gradually transforming into {{final_form}}, {{art_style}} artistic style, dramatic transformation sequence, creative and imaginative atmosphere',
    variables: ['starting_form', 'final_form', 'art_style'],
    motion: {
      cameraMovement: 'reveal',
      objectMotion: ['morphing', 'transformation', 'dramatic-reveal'],
      transitionType: 'morph',
      duration: 8
    },
    mood: ['creative', 'dramatic', 'transformative'],
    tags: ['transformation', 'artistic', 'creative', 'dramatic', 'metamorphosis'],
    isPublic: true
  },

  // Educational Templates
  {
    id: 'step-by-step-tutorial',
    name: 'Step-by-Step Tutorial',
    description: 'Clear instructional demonstration with focused attention and progressive revelation',
    category: 'educational',
    template: 'Step-by-step demonstration of {{process}}, clear focus on important details, {{highlight_color}} highlights and indicators, instructional pacing, educational clarity',
    variables: ['process', 'highlight_color'],
    motion: {
      cameraMovement: 'focus-shift',
      objectMotion: ['step-by-step', 'highlight-reveal'],
      transitionType: 'cut',
      duration: 8
    },
    mood: ['instructional', 'clear', 'focused'],
    tags: ['tutorial', 'education', 'step-by-step', 'instructional', 'learning'],
    isPublic: true
  },
  {
    id: 'concept-visualization',
    name: 'Concept Visualization',
    description: 'Abstract concepts made visual with smooth progressive reveals and educational clarity',
    category: 'educational',
    template: 'Visual representation of {{concept}} using {{visualization_style}} style, progressive build-up of ideas, smooth transitions between related concepts, educational and informative atmosphere',
    variables: ['concept', 'visualization_style'],
    motion: {
      cameraMovement: 'reveal',
      objectMotion: ['build-up', 'progressive-reveal', 'concept-connection'],
      transitionType: 'slide',
      duration: 8
    },
    mood: ['educational', 'informative', 'clear'],
    tags: ['concept', 'visualization', 'education', 'explanation', 'learning'],
    isPublic: true
  },
  {
    id: 'data-infographic',
    name: 'Data Infographic',
    description: 'Animated data presentation with charts, graphs and visual statistics',
    category: 'educational',
    template: '{{data_type}} presented as animated infographic, {{chart_style}} charts and graphs, {{color_scheme}} color coding, professional data visualization, clear and informative',
    variables: ['data_type', 'chart_style', 'color_scheme'],
    motion: {
      cameraMovement: 'focus-shift',
      objectMotion: ['data-reveal', 'chart-animation', 'progressive-build'],
      transitionType: 'slide',
      duration: 8
    },
    mood: ['professional', 'informative', 'analytical'],
    tags: ['data', 'infographic', 'charts', 'statistics', 'professional'],
    isPublic: true
  },

  // Entertainment Templates
  {
    id: 'character-action-sequence',
    name: 'Character Action Sequence',
    description: 'Dynamic character animation with expressive movements and personality-driven actions',
    category: 'entertainment',
    template: '{{character}} performing {{action}} with dynamic expressions and personality, {{animation_style}} animation style, engaging and charismatic performance, entertaining atmosphere',
    variables: ['character', 'action', 'animation_style'],
    motion: {
      cameraMovement: 'dynamic',
      objectMotion: ['character-animation', 'expressions', 'dynamic-action'],
      transitionType: 'impact',
      duration: 8
    },
    mood: ['energetic', 'entertaining', 'charismatic'],
    tags: ['character', 'action', 'animation', 'entertainment', 'personality'],
    isPublic: true
  },
  {
    id: 'cinematic-scene',
    name: 'Cinematic Scene',
    description: 'Movie-quality scene with professional cinematography and dramatic atmosphere',
    category: 'entertainment',
    template: 'Cinematic {{scene_type}} scene with {{mood}} atmosphere, professional cinematography, {{lighting_style}} lighting, dramatic and engaging visual storytelling',
    variables: ['scene_type', 'mood', 'lighting_style'],
    motion: {
      cameraMovement: 'cinematic',
      objectMotion: ['dramatic-movement', 'cinematic-action'],
      transitionType: 'cinematic',
      duration: 8
    },
    mood: ['cinematic', 'dramatic', 'professional'],
    tags: ['cinematic', 'movie', 'dramatic', 'storytelling', 'professional'],
    isPublic: true
  },
  {
    id: 'gaming-intro',
    name: 'Gaming Intro',
    description: 'High-energy gaming introduction with epic visuals and dynamic effects',
    category: 'entertainment',
    template: 'Epic {{game_element}} introduction, high-energy {{visual_effects}} effects, {{color_palette}} gaming colors, dynamic and exciting atmosphere, optimized for gaming content',
    variables: ['game_element', 'visual_effects', 'color_palette'],
    motion: {
      cameraMovement: 'dynamic',
      objectMotion: ['epic-reveal', 'high-energy', 'gaming-effects'],
      transitionType: 'impact',
      duration: 8
    },
    mood: ['epic', 'energetic', 'gaming'],
    tags: ['gaming', 'intro', 'epic', 'high-energy', 'effects'],
    isPublic: true
  },

  // Bonus Creative Templates
  {
    id: 'minimalist-elegance',
    name: 'Minimalist Elegance',
    description: 'Clean, minimalist design with subtle animations and elegant simplicity',
    category: 'creative',
    template: 'Minimalist {{subject}} with clean lines and elegant simplicity, {{accent_color}} accents, subtle sophisticated movement, premium and refined atmosphere',
    variables: ['subject', 'accent_color'],
    motion: {
      cameraMovement: 'gentle-drift',
      objectMotion: ['subtle-float', 'elegant-reveal'],
      transitionType: 'fade',
      duration: 8
    },
    mood: ['elegant', 'minimal', 'sophisticated'],
    tags: ['minimalist', 'elegant', 'clean', 'sophisticated', 'premium'],
    isPublic: true
  },
  {
    id: 'retro-synthwave',
    name: 'Retro Synthwave',
    description: '80s-inspired synthwave aesthetic with neon colors and retro-futuristic vibes',
    category: 'creative',
    template: 'Retro synthwave {{element}} with neon {{neon_colors}} colors, 80s-inspired aesthetic, grid patterns and geometric shapes, nostalgic futuristic atmosphere',
    variables: ['element', 'neon_colors'],
    motion: {
      cameraMovement: 'flowing',
      objectMotion: ['neon-pulse', 'retro-scan', 'geometric-shift'],
      transitionType: 'neon-fade',
      duration: 8
    },
    mood: ['retro', 'futuristic', 'nostalgic'],
    tags: ['retro', 'synthwave', '80s', 'neon', 'futuristic'],
    isPublic: true
  },
  {
    id: 'seasonal-celebration',
    name: 'Seasonal Celebration',
    description: 'Festive seasonal content with holiday-specific elements and celebratory mood',
    category: 'marketing',
    template: '{{season}} celebration scene with {{seasonal_elements}}, festive {{holiday_colors}} colors, joyful and celebratory atmosphere, seasonal decorations and ambiance',
    variables: ['season', 'seasonal_elements', 'holiday_colors'],
    motion: {
      cameraMovement: 'gentle-drift',
      objectMotion: ['festive-sparkle', 'seasonal-sway', 'celebration-float'],
      transitionType: 'sparkle-fade',
      duration: 8
    },
    mood: ['festive', 'joyful', 'celebratory'],
    tags: ['seasonal', 'holiday', 'celebration', 'festive', 'marketing'],
    isPublic: true
  }
];

// Helper functions for template management
export function getTemplatesByCategory(category: string): VideoTemplate[] {
  return VIDEO_TEMPLATES.filter(template => template.category === category);
}

export function getTemplateById(id: string): VideoTemplate | undefined {
  return VIDEO_TEMPLATES.find(template => template.id === id);
}

export function getPopularTemplates(limit: number = 5): VideoTemplate[] {
  return VIDEO_TEMPLATES
    .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
    .slice(0, limit);
}

export function searchTemplates(query: string): VideoTemplate[] {
  const lowercaseQuery = query.toLowerCase();
  return VIDEO_TEMPLATES.filter(template => 
    template.name.toLowerCase().includes(lowercaseQuery) ||
    template.description.toLowerCase().includes(lowercaseQuery) ||
    template.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
  );
}

export const TEMPLATE_CATEGORIES = [
  { key: 'marketing', label: 'Marketing/Ads', icon: '📢', count: getTemplatesByCategory('marketing').length },
  { key: 'creative', label: 'Creative/Artistic', icon: '🎨', count: getTemplatesByCategory('creative').length },
  { key: 'educational', label: 'Educational', icon: '📚', count: getTemplatesByCategory('educational').length },
  { key: 'entertainment', label: 'Entertainment', icon: '🎬', count: getTemplatesByCategory('entertainment').length },
] as const;