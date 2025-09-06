import { 
  PenTool, 
  Brain, 
  Camera, 
  Video, 
  Package,
  Sparkles,
  Download,
  Upload
} from 'lucide-react';

// Couleurs thématiques pour chaque type de nœud (style n8n dark)
export const NODE_THEMES = {
  prompt: {
    accent: '#3B82F6',      // Bleu - Input utilisateur
    accentLight: '#3B82F6/20',
    accentBorder: '#3B82F6/40',
    icon: PenTool,
    name: 'prompt_input'
  },
  enhance: {
    accent: '#8B5CF6',      // Violet - AI Enhancement
    accentLight: '#8B5CF6/20', 
    accentBorder: '#8B5CF6/40',
    icon: Brain,
    name: 'gpt_enhance'
  },
  image: {
    accent: '#10B981',      // Vert - Génération d'image
    accentLight: '#10B981/20',
    accentBorder: '#10B981/40', 
    icon: Camera,
    name: 'dalle_gen'
  },
  video: {
    accent: '#EF4444',      // Rouge - Génération de vidéo
    accentLight: '#EF4444/20',
    accentBorder: '#EF4444/40',
    icon: Video, 
    name: 'veo3_gen'
  },
  output: {
    accent: '#F59E0B',      // Orange - Finalisation
    accentLight: '#F59E0B/20',
    accentBorder: '#F59E0B/40',
    icon: Package,
    name: 'final_output'
  },
  'image-upload': {
    accent: '#10B981',      // Vert - Upload d'image
    accentLight: '#10B981/20',
    accentBorder: '#10B981/40',
    icon: Upload,
    name: 'image_upload'
  }
} as const;

// Couleurs d'état pour tous les nœuds
export const STATUS_COLORS = {
  idle: {
    bg: 'bg-[#1A1A1A]',
    border: 'border-[#333333]',
    text: 'text-white/80',
    badge: 'bg-gray-600 text-white'
  },
  loading: {
    bg: 'bg-[#1A1A1A]', 
    border: 'border-current',
    text: 'text-white',
    badge: 'bg-blue-500 text-white animate-pulse'
  },
  success: {
    bg: 'bg-[#1A1A1A]',
    border: 'border-green-500/60',
    text: 'text-white',
    badge: 'bg-green-500 text-white'
  },
  error: {
    bg: 'bg-[#1A1A1A]',
    border: 'border-red-500/60', 
    text: 'text-white',
    badge: 'bg-red-500 text-white'
  }
} as const;

// Tailles responsives des nœuds
export const NODE_SIZES = {
  compact: 'w-64 min-h-[180px]',   // Mobile
  default: 'w-80 min-h-[220px]',   // Desktop
  expanded: 'w-96 min-h-[280px]'   // Large screen
} as const;

// Styles de handle pour les connexions
export const HANDLE_STYLES = {
  base: 'w-3 h-3 border-2 transition-all duration-200',
  idle: 'bg-gray-600 border-gray-500',
  active: 'bg-blue-500 border-blue-400 shadow-lg shadow-blue-500/50',
  success: 'bg-green-500 border-green-400 shadow-lg shadow-green-500/50',
  error: 'bg-red-500 border-red-400 shadow-lg shadow-red-500/50'
} as const;