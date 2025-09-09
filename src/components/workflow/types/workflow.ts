import { Node, Edge } from 'reactflow';

// États possibles pour chaque nœud du workflow
export type WorkflowNodeStatus = 'idle' | 'loading' | 'success' | 'error';

// Types de workflows supportés
export type WorkflowType = 'text-to-video' | 'text-to-image' | 'image-to-video';

// Types de nœuds dans le workflow
export type WorkflowNodeType = 'prompt' | 'enhance' | 'image' | 'video' | 'output' | 'image-upload';

// Configuration spécifique à chaque type de nœud
export interface NodeConfig {
  // Configuration commune
  costCredits?: number;
  estimatedDuration?: number; // en ms
  
  // Configuration spécifique au nœud prompt
  prompt?: {
    maxLength: number;
    placeholder: string;
  };
  
  // Configuration spécifique au nœud enhance
  enhance?: {
    model: 'gpt-4' | 'gpt-4-turbo' | 'gpt-3.5-turbo';
    temperature: number;
  };
  
  // Configuration spécifique au nœud image
  image?: {
    provider: 'dalle' | 'midjourney' | 'stable-diffusion';
    style: 'natural' | 'vivid';
    quality: 'standard' | 'hd';
    size: '1024x1024' | '1792x1024' | '1024x1792';
  };
  
  // Configuration spécifique au nœud vidéo
  video?: {
    provider: 'vo3' | 'runway' | 'pika';
    duration: 8 | 15 | 30 | 60; // en secondes
    resolution: '720p' | '1080p' | '4k';
    generateAudio: boolean;
  };
  
  // Configuration spécifique au nœud output
  output?: {
    formats: string[];
    quality: string;
    downloadEnabled: boolean;
  };

  // Configuration spécifique au nœud image-upload
  imageUpload?: {
    acceptedFormats: string[];
    maxFileSize: number; // en bytes
    maxDimensions: { width: number; height: number };
  };
}

// Données spécifiques à chaque nœud
export interface WorkflowNodeData {
  label: string;
  status: WorkflowNodeStatus;
  progress?: number; // 0-100 pour les barres de progression
  duration?: number; // durée réelle d'exécution en ms
  
  // Contenu d'entrée et de sortie
  input?: any;
  output?: any;
  
  // Configuration du nœud
  config?: NodeConfig;
  
  // Métadonnées d'exécution
  startTime?: number;
  endTime?: number;
  completedAt?: string; // ISO string timestamp
  processingTime?: number; // durée de traitement en ms
  errorMessage?: string;
  
  // Données spécifiques par type
  promptData?: {
    originalPrompt: string;
    characterCount: number;
  };
  
  enhanceData?: {
    originalPrompt: string;
    enhancedPrompt: string;
    tokensUsed: number;
    improvementScore?: number;
  };
  
  imageData?: {
    prompt: string;
    imageUrl?: string;
    thumbnailUrl?: string;
    width: number;
    height: number;
    fileSize?: number;
    generationTime?: number;
  };
  
  videoData?: {
    prompt: string;
    imageUrl: string;
    videoUrl?: string;
    thumbnailUrl?: string;
    duration: number;
    resolution: string;
    fileSize?: number;
    generationTime?: number;
    hasAudio: boolean;
  };
  
  outputData?: {
    finalVideoUrl?: string;
    downloadUrls?: Record<string, string>;
    metadata?: {
      duration: number;
      resolution: string;
      fileSize: number;
      format: string;
    };
  };

  imageUploadData?: {
    originalFile?: File;
    uploadedUrl?: string;
    thumbnailUrl?: string;
    width: number;
    height: number;
    fileSize: number;
    format: string;
  };
}

// Type de nœud React Flow étendu pour notre workflow
export interface WorkflowNode extends Node {
  id: string;
  type: WorkflowNodeType;
  position: { x: number; y: number };
  data: WorkflowNodeData;
  selected?: boolean;
  dragging?: boolean;
}

// Type d'edge React Flow pour les connexions
export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  type?: 'default' | 'animated' | 'smoothstep';
  style?: React.CSSProperties;
  data?: {
    transferring?: boolean;
    transferProgress?: number;
  };
}

// Templates de workflows disponibles
export interface WorkflowTemplate {
  id: WorkflowType;
  name: string;
  description: string;
  nodes: WorkflowNodeType[];
  edges: Array<{ from: WorkflowNodeType; to: WorkflowNodeType }>;
  estimatedCost: number;
  estimatedDuration: number; // en ms
}

// État global du workflow
export interface WorkflowState {
  // Type de workflow sélectionné
  selectedWorkflowType: WorkflowType | null;
  
  // Configuration actuelle du workflow
  currentConfig?: WorkflowConfig;
  
  // Identifiants
  workflowId?: string;
  userId?: string;
  projectId?: string;
  
  // Nœuds et connexions
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  
  // État global
  isRunning: boolean;
  isPaused: boolean;
  currentNodeId?: string;
  
  // Progression globale
  overallProgress: number; // 0-100
  currentStep: number; // 1-5
  totalSteps: number; // 5
  
  // Temps et coûts
  startTime?: number;
  endTime?: number;
  estimatedTimeRemaining?: number;
  totalCreditsUsed: number;
  estimatedTotalCost: number;
  
  // Résultats et erreurs
  result?: {
    imageUrl?: string;
    videoUrl?: string;
    metadata?: any;
  };
  error?: {
    nodeId: string;
    message: string;
    code?: string;
    details?: any;
  };
  
  // Historique
  executionHistory: WorkflowExecution[];
}

// Configuration initiale du workflow
export interface WorkflowConfig {
  workflowType: 'complete' | 'image-only' | 'video-from-image';
  initialPrompt: string;
  customImageUrl?: string; // Pour video-from-image workflow
  imageConfig: {
    style: 'natural' | 'vivid';
    quality: 'standard' | 'hd';
    size: '1024x1024' | '1792x1024' | '1024x1792';
  };
  videoConfig: {
    duration: 5 | 8 | 15 | 30 | 60;
    resolution: '720p' | '1080p' | '4k';
    generateAudio?: boolean;
    motionIntensity?: 'low' | 'medium' | 'high';
  };
  projectId?: string;
  userId?: string;
}

// Historique d'exécution
export interface WorkflowExecution {
  id: string;
  startTime: number;
  endTime?: number;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  config: WorkflowConfig;
  result?: {
    imageUrl?: string;
    videoUrl?: string;
    totalCreditsUsed: number;
    executionTime: number;
  };
  error?: {
    nodeId: string;
    message: string;
  };
}

// Actions pour le store Zustand
export interface WorkflowActions {
  // Gestion du type de workflow
  selectWorkflowType: (type: WorkflowType) => void;
  generateWorkflowFromTemplate: (type: WorkflowType) => void;
  updateWorkflowConfig: (config: Partial<WorkflowConfig>) => void;
  
  // Gestion des nœuds
  updateNodeData: (nodeId: string, data: Partial<WorkflowNodeData>) => void;
  updateNodeStatus: (nodeId: string, status: WorkflowNodeStatus) => void;
  updateNodeProgress: (nodeId: string, progress: number) => void;
  setNodeError: (nodeId: string, error: string) => void;
  
  // Gestion des edges
  updateEdgeData: (edgeId: string, data: any) => void;
  setEdgeTransferring: (edgeId: string, transferring: boolean, progress?: number) => void;
  
  // Contrôle du workflow
  startWorkflow: (config: WorkflowConfig) => Promise<void>;
  pauseWorkflow: () => void;
  resumeWorkflow: () => void;
  cancelWorkflow: () => void;
  resetWorkflow: () => void;
  
  // Gestion de l'état
  setCurrentNode: (nodeId: string) => void;
  updateOverallProgress: (progress: number) => void;
  setWorkflowResult: (result: any) => void;
  setWorkflowError: (error: { nodeId: string; message: string; code?: string }) => void;
  
  // Utilitaires
  getNodeById: (nodeId: string) => WorkflowNode | undefined;
  getEdgeById: (edgeId: string) => WorkflowEdge | undefined;
  isNodeCompleted: (nodeId: string) => boolean;
  canExecuteNode: (nodeId: string) => boolean;
}

// Type complet du store
export interface WorkflowStore extends WorkflowState, WorkflowActions {}

// Constantes pour les nœuds
export const NODE_TYPES = {
  PROMPT: 'prompt' as const,
  ENHANCE: 'enhance' as const,
  IMAGE: 'image' as const,
  VIDEO: 'video' as const,
  OUTPUT: 'output' as const,
  IMAGE_UPLOAD: 'image-upload' as const,
} as const;

export const NODE_IDS = {
  PROMPT: 'prompt-node',
  ENHANCE: 'enhance-node', 
  IMAGE: 'image-node',
  VIDEO: 'video-node',
  OUTPUT: 'output-node',
  IMAGE_UPLOAD: 'image-upload-node',
} as const;

// Positions par défaut des nœuds
export const DEFAULT_NODE_POSITIONS = {
  [NODE_IDS.PROMPT]: { x: 100, y: 100 },
  [NODE_IDS.ENHANCE]: { x: 400, y: 100 },
  [NODE_IDS.IMAGE]: { x: 700, y: 100 },
  [NODE_IDS.VIDEO]: { x: 1000, y: 100 },
  [NODE_IDS.OUTPUT]: { x: 1300, y: 100 },
  [NODE_IDS.IMAGE_UPLOAD]: { x: 100, y: 100 },
} as const;

// Coûts en crédits par type de nœud
export const NODE_CREDIT_COSTS = {
  [NODE_TYPES.PROMPT]: 0,
  [NODE_TYPES.ENHANCE]: 1,
  [NODE_TYPES.IMAGE]: 5, // varie selon la qualité
  [NODE_TYPES.VIDEO]: 15, // varie selon la durée
  [NODE_TYPES.OUTPUT]: 0,
  [NODE_TYPES.IMAGE_UPLOAD]: 0,
} as const;

// Durées estimées en millisecondes
export const NODE_ESTIMATED_DURATIONS = {
  [NODE_TYPES.PROMPT]: 0,
  [NODE_TYPES.ENHANCE]: 5000, // 5s
  [NODE_TYPES.IMAGE]: 30000, // 30s
  [NODE_TYPES.VIDEO]: 120000, // 2min
  [NODE_TYPES.OUTPUT]: 5000, // 5s
  [NODE_TYPES.IMAGE_UPLOAD]: 1000, // 1s
} as const;

// Templates de workflows prédéfinis
export const WORKFLOW_TEMPLATES: Record<WorkflowType, WorkflowTemplate> = {
  'text-to-video': {
    id: 'text-to-video',
    name: 'Text-to-Video',
    description: 'Generate videos directly from text descriptions',
    nodes: [NODE_TYPES.PROMPT, NODE_TYPES.ENHANCE, NODE_TYPES.VIDEO, NODE_TYPES.OUTPUT],
    edges: [
      { from: NODE_TYPES.PROMPT, to: NODE_TYPES.ENHANCE },
      { from: NODE_TYPES.ENHANCE, to: NODE_TYPES.VIDEO },
      { from: NODE_TYPES.VIDEO, to: NODE_TYPES.OUTPUT }
    ],
    estimatedCost: NODE_CREDIT_COSTS[NODE_TYPES.ENHANCE] + NODE_CREDIT_COSTS[NODE_TYPES.VIDEO],
    estimatedDuration: NODE_ESTIMATED_DURATIONS[NODE_TYPES.ENHANCE] + NODE_ESTIMATED_DURATIONS[NODE_TYPES.VIDEO] + NODE_ESTIMATED_DURATIONS[NODE_TYPES.OUTPUT]
  },
  'text-to-image': {
    id: 'text-to-image',
    name: 'Text-to-Image',
    description: 'Create stunning images from text prompts',
    nodes: [NODE_TYPES.PROMPT, NODE_TYPES.ENHANCE, NODE_TYPES.IMAGE, NODE_TYPES.OUTPUT],
    edges: [
      { from: NODE_TYPES.PROMPT, to: NODE_TYPES.ENHANCE },
      { from: NODE_TYPES.ENHANCE, to: NODE_TYPES.IMAGE },
      { from: NODE_TYPES.IMAGE, to: NODE_TYPES.OUTPUT }
    ],
    estimatedCost: NODE_CREDIT_COSTS[NODE_TYPES.ENHANCE] + NODE_CREDIT_COSTS[NODE_TYPES.IMAGE],
    estimatedDuration: NODE_ESTIMATED_DURATIONS[NODE_TYPES.ENHANCE] + NODE_ESTIMATED_DURATIONS[NODE_TYPES.IMAGE] + NODE_ESTIMATED_DURATIONS[NODE_TYPES.OUTPUT]
  },
  'image-to-video': {
    id: 'image-to-video',
    name: 'Image-to-Video',
    description: 'Animate existing images into videos',
    nodes: [NODE_TYPES.IMAGE_UPLOAD, NODE_TYPES.VIDEO, NODE_TYPES.OUTPUT],
    edges: [
      { from: NODE_TYPES.IMAGE_UPLOAD, to: NODE_TYPES.VIDEO },
      { from: NODE_TYPES.VIDEO, to: NODE_TYPES.OUTPUT }
    ],
    estimatedCost: NODE_CREDIT_COSTS[NODE_TYPES.VIDEO],
    estimatedDuration: NODE_ESTIMATED_DURATIONS[NODE_TYPES.IMAGE_UPLOAD] + NODE_ESTIMATED_DURATIONS[NODE_TYPES.VIDEO] + NODE_ESTIMATED_DURATIONS[NODE_TYPES.OUTPUT]
  }
} as const;