export interface PromptTemplate {
  id: string;
  title: string;
  category: 'image' | 'video' | 'combined';
  imagePrompt?: string;
  videoPrompt?: string;
  tags: string[];
  description: string;
  config?: {
    imageStyle?: 'natural' | 'vivid';
    imageQuality?: 'standard' | 'hd';
    videoStyle?: 'cinematic' | 'realistic' | 'animated';
    videoDuration?: 5 | 10 | 15 | 20;
    videoAspectRatio?: '16:9' | '9:16' | '1:1';
    cameraMovement?: 'static' | 'pan' | 'zoom' | 'tracking';
  };
}

export const IMAGE_TEMPLATES: PromptTemplate[] = [
  {
    id: 'minimalist-workspace',
    title: 'Minimalist Workspace',
    category: 'image',
    imagePrompt: 'a clean, minimalist desk setup with a laptop, coffee cup, and plant, soft natural lighting, modern aesthetic, white and wood tones',
    tags: ['workspace', 'minimalist', 'productivity'],
    description: 'Clean workspace perfect for productivity content',
    config: {
      imageStyle: 'natural',
      imageQuality: 'hd',
    },
  },
  {
    id: 'golden-hour-portrait',
    title: 'Golden Hour Portrait',
    category: 'image',
    imagePrompt: 'portrait of a person silhouetted against a golden sunset, dramatic backlighting, cinematic composition, warm orange and pink sky',
    tags: ['portrait', 'golden-hour', 'cinematic'],
    description: 'Dramatic portrait with golden hour lighting',
    config: {
      imageStyle: 'vivid',
      imageQuality: 'hd',
    },
  },
  {
    id: 'urban-skyline',
    title: 'Urban Skyline',
    category: 'image',
    imagePrompt: 'modern city skyline at dusk, glass buildings reflecting purple and orange sky, bustling urban life, architectural photography style',
    tags: ['urban', 'skyline', 'city'],
    description: 'Modern cityscape perfect for business content',
    config: {
      imageStyle: 'vivid',
      imageQuality: 'hd',
    },
  },
  {
    id: 'nature-landscape',
    title: 'Nature Landscape',
    category: 'image',
    imagePrompt: 'serene mountain landscape with a crystal clear lake, lush green forest, morning mist, photorealistic nature photography',
    tags: ['nature', 'landscape', 'peaceful'],
    description: 'Tranquil nature scene for wellness content',
    config: {
      imageStyle: 'natural',
      imageQuality: 'hd',
    },
  },
  {
    id: 'creative-abstract',
    title: 'Creative Abstract',
    category: 'image',
    imagePrompt: 'abstract geometric shapes in vibrant colors, fluid motion, digital art style, purple and cyan gradients, modern artistic composition',
    tags: ['abstract', 'creative', 'artistic'],
    description: 'Artistic abstract design for creative content',
    config: {
      imageStyle: 'vivid',
      imageQuality: 'hd',
    },
  },
];

export const VIDEO_TEMPLATES: PromptTemplate[] = [
  {
    id: 'smooth-pan',
    title: 'Smooth Pan Movement',
    category: 'video',
    videoPrompt: 'smooth horizontal pan across the scene, revealing details gradually, cinematic camera movement with natural motion blur',
    tags: ['pan', 'smooth', 'cinematic'],
    description: 'Elegant pan movement for revealing scenes',
    config: {
      videoStyle: 'cinematic',
      cameraMovement: 'pan',
      videoDuration: 10,
    },
  },
  {
    id: 'dramatic-zoom',
    title: 'Dramatic Zoom',
    category: 'video',
    videoPrompt: 'slow zoom in towards the main subject, building tension and focus, dramatic lighting changes, cinematic depth of field',
    tags: ['zoom', 'dramatic', 'focus'],
    description: 'Zoom movement to create focus and drama',
    config: {
      videoStyle: 'cinematic',
      cameraMovement: 'zoom',
      videoDuration: 15,
    },
  },
  {
    id: 'realistic-static',
    title: 'Realistic Static',
    category: 'video',
    videoPrompt: 'static camera with natural environmental movements, subtle lighting changes, realistic atmospheric effects, gentle wind or water movement',
    tags: ['static', 'realistic', 'natural'],
    description: 'Realistic scene with natural environmental motion',
    config: {
      videoStyle: 'realistic',
      cameraMovement: 'static',
      videoDuration: 10,
    },
  },
  {
    id: 'animated-style',
    title: 'Animated Style',
    category: 'video',
    videoPrompt: 'stylized animation with exaggerated movements, vibrant color transitions, cartoon-like motion, playful and energetic atmosphere',
    tags: ['animated', 'stylized', 'energetic'],
    description: 'Animated style for fun, energetic content',
    config: {
      videoStyle: 'animated',
      cameraMovement: 'tracking',
      videoDuration: 10,
    },
  },
];

export const COMBINED_TEMPLATES: PromptTemplate[] = [
  {
    id: 'entrepreneur-motivation',
    title: 'Entrepreneur Motivation',
    category: 'combined',
    imagePrompt: 'successful entrepreneur working late in a modern office, city lights in background, determined expression, professional lighting',
    videoPrompt: 'camera slowly pans around the person while they work, city lights twinkle outside, inspirational and motivational atmosphere',
    tags: ['entrepreneur', 'motivation', 'business'],
    description: 'Motivational content for entrepreneurs',
    config: {
      imageStyle: 'vivid',
      imageQuality: 'hd',
      videoStyle: 'cinematic',
      cameraMovement: 'pan',
      videoDuration: 15,
      videoAspectRatio: '9:16',
    },
  },
  {
    id: 'wellness-meditation',
    title: 'Wellness & Meditation',
    category: 'combined',
    imagePrompt: 'person meditating in a peaceful natural setting, soft morning light, zen garden or forest background, serene and calming',
    videoPrompt: 'gentle camera movement around the meditating figure, natural sounds implied, leaves rustling softly, peaceful transitions',
    tags: ['wellness', 'meditation', 'peaceful'],
    description: 'Calming wellness and meditation content',
    config: {
      imageStyle: 'natural',
      imageQuality: 'hd',
      videoStyle: 'realistic',
      cameraMovement: 'tracking',
      videoDuration: 20,
      videoAspectRatio: '9:16',
    },
  },
  {
    id: 'product-showcase',
    title: 'Product Showcase',
    category: 'combined',
    imagePrompt: 'modern product display on clean white background, professional studio lighting, minimalist composition, high-end commercial photography',
    videoPrompt: 'smooth 360-degree rotation around the product, lighting highlights different features, professional commercial video style',
    tags: ['product', 'commercial', 'showcase'],
    description: 'Professional product demonstration',
    config: {
      imageStyle: 'natural',
      imageQuality: 'hd',
      videoStyle: 'cinematic',
      cameraMovement: 'tracking',
      videoDuration: 10,
      videoAspectRatio: '1:1',
    },
  },
  {
    id: 'creative-art',
    title: 'Creative Art Process',
    category: 'combined',
    imagePrompt: 'artist working on a colorful painting in a bright studio, paint brushes and palette visible, creative chaos organized beautifully',
    videoPrompt: 'time-lapse style movement showing the creative process, paint colors blending and flowing, artistic and inspiring atmosphere',
    tags: ['art', 'creative', 'process'],
    description: 'Artistic creative process content',
    config: {
      imageStyle: 'vivid',
      imageQuality: 'hd',
      videoStyle: 'animated',
      cameraMovement: 'zoom',
      videoDuration: 15,
      videoAspectRatio: '9:16',
    },
  },
  {
    id: 'tech-innovation',
    title: 'Tech Innovation',
    category: 'combined',
    imagePrompt: 'futuristic technology setup with holographic displays, sleek devices, blue and purple neon lighting, sci-fi aesthetic',
    videoPrompt: 'dynamic camera movement through the tech setup, holographic elements animated, futuristic and high-tech atmosphere',
    tags: ['technology', 'futuristic', 'innovation'],
    description: 'Futuristic technology and innovation',
    config: {
      imageStyle: 'vivid',
      imageQuality: 'hd',
      videoStyle: 'cinematic',
      cameraMovement: 'tracking',
      videoDuration: 10,
      videoAspectRatio: '16:9',
    },
  },
];

export const ALL_TEMPLATES = [
  ...IMAGE_TEMPLATES,
  ...VIDEO_TEMPLATES,
  ...COMBINED_TEMPLATES,
];

// Fonction pour obtenir des templates par catégorie
export function getTemplatesByCategory(category: 'image' | 'video' | 'combined'): PromptTemplate[] {
  return ALL_TEMPLATES.filter(template => template.category === category);
}

// Fonction pour rechercher des templates par tags
export function searchTemplatesByTags(tags: string[]): PromptTemplate[] {
  return ALL_TEMPLATES.filter(template =>
    tags.some(tag => template.tags.includes(tag.toLowerCase()))
  );
}

// Fonction pour obtenir des suggestions basées sur un prompt
export function getSuggestedTemplates(prompt: string): PromptTemplate[] {
  const promptLower = prompt.toLowerCase();
  
  return ALL_TEMPLATES.filter(template => {
    // Recherche dans les tags
    const tagMatch = template.tags.some(tag => promptLower.includes(tag));
    
    // Recherche dans les prompts
    const promptMatch = (
      (template.imagePrompt && template.imagePrompt.toLowerCase().includes(promptLower)) ||
      (template.videoPrompt && template.videoPrompt.toLowerCase().includes(promptLower))
    );
    
    return tagMatch || promptMatch;
  }).slice(0, 5); // Limiter à 5 suggestions
}

// Fonction pour appliquer un template
export function applyTemplate(template: PromptTemplate): {
  imagePrompt?: string;
  videoPrompt?: string;
  config?: PromptTemplate['config'];
} {
  return {
    imagePrompt: template.imagePrompt,
    videoPrompt: template.videoPrompt,
    config: template.config,
  };
}

// Optimisations de prompts pour la génération
export const PROMPT_OPTIMIZATIONS = {
  // Mots-clés pour améliorer la qualité d'image
  IMAGE_QUALITY_ENHANCERS: [
    'high resolution',
    'professional photography',
    'detailed',
    'sharp focus',
    'studio lighting',
    'photorealistic',
  ],
  
  // Mots-clés pour améliorer la qualité vidéo
  VIDEO_QUALITY_ENHANCERS: [
    'cinematic',
    'smooth camera movement',
    'professional video',
    'high frame rate',
    'dynamic lighting',
    'film quality',
  ],
  
  // Styles artistiques populaires
  ARTISTIC_STYLES: [
    'minimalist',
    'vintage',
    'modern',
    'abstract',
    'realistic',
    'artistic',
    'professional',
    'creative',
  ],
};

// Fonction pour optimiser automatiquement un prompt
export function optimizePrompt(prompt: string, type: 'image' | 'video'): string {
  const enhancers = type === 'image' 
    ? PROMPT_OPTIMIZATIONS.IMAGE_QUALITY_ENHANCERS
    : PROMPT_OPTIMIZATIONS.VIDEO_QUALITY_ENHANCERS;
  
  // Vérifier si le prompt contient déjà des améliorateurs
  const hasQualityEnhancers = enhancers.some(enhancer =>
    prompt.toLowerCase().includes(enhancer.toLowerCase())
  );
  
  if (!hasQualityEnhancers) {
    // Ajouter des améliorateurs appropriés
    const randomEnhancer = enhancers[Math.floor(Math.random() * enhancers.length)];
    return `${prompt}, ${randomEnhancer}`;
  }
  
  return prompt;
}