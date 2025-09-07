import { create } from 'zustand';
import { 
  WorkflowStore, 
  WorkflowNode, 
  WorkflowEdge, 
  WorkflowConfig,
  WorkflowNodeStatus,
  WorkflowNodeData,
  WorkflowType,
  WORKFLOW_TEMPLATES,
  NODE_IDS,
  NODE_TYPES,
  DEFAULT_NODE_POSITIONS,
  NODE_CREDIT_COSTS,
  NODE_ESTIMATED_DURATIONS
} from '../types/workflow';
import { v4 as uuidv4 } from 'uuid';
import { workflowService } from '../services/workflow-service';

// Nœuds initiaux du workflow
const createInitialNodes = (): WorkflowNode[] => [
  {
    id: NODE_IDS.PROMPT,
    type: NODE_TYPES.PROMPT,
    position: DEFAULT_NODE_POSITIONS[NODE_IDS.PROMPT],
    data: {
      label: 'prompt_input',
      status: 'idle',
      config: {
        costCredits: NODE_CREDIT_COSTS[NODE_TYPES.PROMPT],
        estimatedDuration: NODE_ESTIMATED_DURATIONS[NODE_TYPES.PROMPT],
        prompt: {
          maxLength: 1000,
          placeholder: 'Describe the image you want to generate...'
        }
      },
      promptData: {
        originalPrompt: '',
        characterCount: 0
      }
    }
  },
  {
    id: NODE_IDS.ENHANCE,
    type: NODE_TYPES.ENHANCE,
    position: DEFAULT_NODE_POSITIONS[NODE_IDS.ENHANCE],
    data: {
      label: 'gpt_enhance',
      status: 'idle',
      config: {
        costCredits: NODE_CREDIT_COSTS[NODE_TYPES.ENHANCE],
        estimatedDuration: NODE_ESTIMATED_DURATIONS[NODE_TYPES.ENHANCE],
        enhance: {
          model: 'gpt-4-turbo',
          temperature: 0.7
        }
      }
    }
  },
  {
    id: NODE_IDS.IMAGE,
    type: NODE_TYPES.IMAGE,
    position: DEFAULT_NODE_POSITIONS[NODE_IDS.IMAGE],
    data: {
      label: 'gpt_image_gen',
      status: 'idle',
      config: {
        costCredits: NODE_CREDIT_COSTS[NODE_TYPES.IMAGE],
        estimatedDuration: NODE_ESTIMATED_DURATIONS[NODE_TYPES.IMAGE],
        image: {
          provider: 'dalle',
          style: 'vivid',
          quality: 'hd',
          size: '1024x1792'
        }
      }
    }
  },
  {
    id: NODE_IDS.VIDEO,
    type: NODE_TYPES.VIDEO,
    position: DEFAULT_NODE_POSITIONS[NODE_IDS.VIDEO],
    data: {
      label: 'veo3_video',
      status: 'idle',
      config: {
        costCredits: NODE_CREDIT_COSTS[NODE_TYPES.VIDEO],
        estimatedDuration: NODE_ESTIMATED_DURATIONS[NODE_TYPES.VIDEO],
        video: {
          provider: 'vo3',
          duration: 8,
          resolution: '1080p',
          generateAudio: true
        }
      }
    }
  },
  {
    id: NODE_IDS.OUTPUT,
    type: NODE_TYPES.OUTPUT,
    position: DEFAULT_NODE_POSITIONS[NODE_IDS.OUTPUT],
    data: {
      label: 'final_output',
      status: 'idle',
      config: {
        costCredits: NODE_CREDIT_COSTS[NODE_TYPES.OUTPUT],
        estimatedDuration: NODE_ESTIMATED_DURATIONS[NODE_TYPES.OUTPUT],
        output: {
          formats: ['mp4', 'webm'],
          quality: 'high',
          downloadEnabled: true
        }
      }
    }
  }
];

// Edges initiaux (connexions entre nœuds)
const createInitialEdges = (): WorkflowEdge[] => [
  {
    id: 'prompt-enhance',
    source: NODE_IDS.PROMPT,
    target: NODE_IDS.ENHANCE,
    type: 'smoothstep',
    style: { stroke: '#64748b', strokeWidth: 2 },
    data: { transferring: false, transferProgress: 0 }
  },
  {
    id: 'enhance-image',
    source: NODE_IDS.ENHANCE,
    target: NODE_IDS.IMAGE,
    type: 'smoothstep',
    style: { stroke: '#64748b', strokeWidth: 2 },
    data: { transferring: false, transferProgress: 0 }
  },
  {
    id: 'image-video',
    source: NODE_IDS.IMAGE,
    target: NODE_IDS.VIDEO,
    type: 'smoothstep',
    style: { stroke: '#64748b', strokeWidth: 2 },
    data: { transferring: false, transferProgress: 0 }
  },
  {
    id: 'video-output',
    source: NODE_IDS.VIDEO,
    target: NODE_IDS.OUTPUT,
    type: 'smoothstep',
    style: { stroke: '#64748b', strokeWidth: 2 },
    data: { transferring: false, transferProgress: 0 }
  }
];

// Fonction pour créer des nœuds selon le type de workflow
const createNodesForWorkflowType = (workflowType: WorkflowType): WorkflowNode[] => {
  const template = WORKFLOW_TEMPLATES[workflowType];
  const nodes: WorkflowNode[] = [];
  
  template.nodes.forEach((nodeType, index) => {
    const nodeId = Object.values(NODE_IDS).find(id => id.includes(nodeType)) || `${nodeType}-node`;
    const position = {
      x: 100 + (index * 300),
      y: 100
    };
    
    let nodeData: WorkflowNodeData;
    
    switch (nodeType) {
      case NODE_TYPES.PROMPT:
        nodeData = {
          label: 'prompt_input',
          status: 'idle',
          config: {
            costCredits: NODE_CREDIT_COSTS[NODE_TYPES.PROMPT],
            estimatedDuration: NODE_ESTIMATED_DURATIONS[NODE_TYPES.PROMPT],
            prompt: {
              maxLength: 1000,
              placeholder: workflowType === 'text-to-video' 
                ? 'Describe the video you want to generate...'
                : 'Describe the image you want to generate...'
            }
          },
          promptData: {
            originalPrompt: '',
            characterCount: 0
          }
        };
        break;

      case NODE_TYPES.ENHANCE:
        nodeData = {
          label: 'gpt_enhance',
          status: 'idle',
          config: {
            costCredits: NODE_CREDIT_COSTS[NODE_TYPES.ENHANCE],
            estimatedDuration: NODE_ESTIMATED_DURATIONS[NODE_TYPES.ENHANCE],
            enhance: {
              model: 'gpt-4-turbo',
              temperature: 0.7
            }
          }
        };
        break;

      case NODE_TYPES.IMAGE:
        nodeData = {
          label: 'gpt_image_gen',
          status: 'idle',
          config: {
            costCredits: NODE_CREDIT_COSTS[NODE_TYPES.IMAGE],
            estimatedDuration: NODE_ESTIMATED_DURATIONS[NODE_TYPES.IMAGE],
            image: {
              provider: 'dalle',
              style: 'vivid',
              quality: 'hd',
              size: '1024x1792'
            }
          }
        };
        break;

      case NODE_TYPES.VIDEO:
        nodeData = {
          label: 'veo3_video',
          status: 'idle',
          config: {
            costCredits: NODE_CREDIT_COSTS[NODE_TYPES.VIDEO],
            estimatedDuration: NODE_ESTIMATED_DURATIONS[NODE_TYPES.VIDEO],
            video: {
              provider: 'vo3',
              duration: 8,
              resolution: '1080p',
              generateAudio: true
            }
          }
        };
        break;

      case NODE_TYPES.OUTPUT:
        nodeData = {
          label: 'final_output',
          status: 'idle',
          config: {
            costCredits: NODE_CREDIT_COSTS[NODE_TYPES.OUTPUT],
            estimatedDuration: NODE_ESTIMATED_DURATIONS[NODE_TYPES.OUTPUT],
            output: {
              formats: workflowType === 'text-to-image' ? ['png', 'jpg'] : ['mp4', 'webm'],
              quality: 'high',
              downloadEnabled: true
            }
          }
        };
        break;

      case NODE_TYPES.IMAGE_UPLOAD:
        nodeData = {
          label: 'image_upload',
          status: 'idle',
          config: {
            costCredits: NODE_CREDIT_COSTS[NODE_TYPES.IMAGE_UPLOAD],
            estimatedDuration: NODE_ESTIMATED_DURATIONS[NODE_TYPES.IMAGE_UPLOAD],
            imageUpload: {
              acceptedFormats: ['png', 'jpg', 'jpeg', 'webp'],
              maxFileSize: 10 * 1024 * 1024, // 10MB
              maxDimensions: { width: 2048, height: 2048 }
            }
          }
        };
        break;

      default:
        nodeData = {
          label: nodeType,
          status: 'idle',
          config: {
            costCredits: 0,
            estimatedDuration: 0
          }
        };
    }

    nodes.push({
      id: nodeId,
      type: nodeType,
      position,
      data: nodeData
    });
  });

  return nodes;
};

// Fonction pour créer des edges selon le type de workflow
const createEdgesForWorkflowType = (workflowType: WorkflowType): WorkflowEdge[] => {
  const template = WORKFLOW_TEMPLATES[workflowType];
  const edges: WorkflowEdge[] = [];
  
  template.edges.forEach(({ from, to }, index) => {
    const sourceId = Object.values(NODE_IDS).find(id => id.includes(from)) || `${from}-node`;
    const targetId = Object.values(NODE_IDS).find(id => id.includes(to)) || `${to}-node`;
    
    edges.push({
      id: `${from}-${to}`,
      source: sourceId,
      target: targetId,
      type: 'smoothstep',
      style: { stroke: '#64748b', strokeWidth: 2 },
      data: { transferring: false, transferProgress: 0 }
    });
  });

  return edges;
};

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  // État initial
  selectedWorkflowType: null,
  nodes: createInitialNodes(),
  edges: createInitialEdges(),
  isRunning: false,
  isPaused: false,
  overallProgress: 0,
  currentStep: 0,
  totalSteps: 5,
  totalCreditsUsed: 0,
  estimatedTotalCost: 0,
  executionHistory: [],

  // Actions pour la gestion du type de workflow
  selectWorkflowType: (type: WorkflowType) => {
    set({ selectedWorkflowType: type });
  },

  generateWorkflowFromTemplate: (type: WorkflowType) => {
    const nodes = createNodesForWorkflowType(type);
    const edges = createEdgesForWorkflowType(type);
    
    // Calculer le coût total estimé
    const estimatedTotalCost = nodes.reduce((total, node) => 
      total + (node.data.config?.costCredits || 0), 0
    );

    set({
      selectedWorkflowType: type,
      nodes,
      edges,
      totalSteps: nodes.length,
      estimatedTotalCost,
      // Reset workflow state
      isRunning: false,
      isPaused: false,
      overallProgress: 0,
      currentStep: 0,
      totalCreditsUsed: 0,
      result: undefined,
      error: undefined
    });
  },

  // Actions pour les nœuds
  updateNodeData: (nodeId: string, data: Partial<WorkflowNodeData>) => {
    set(state => ({
      nodes: state.nodes.map(node =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      )
    }));
  },

  updateNodeStatus: (nodeId: string, status: WorkflowNodeStatus) => {
    set(state => ({
      nodes: state.nodes.map(node =>
        node.id === nodeId
          ? { 
              ...node, 
              data: { 
                ...node.data, 
                status,
                startTime: status === 'loading' ? Date.now() : node.data.startTime,
                endTime: status === 'success' || status === 'error' ? Date.now() : undefined
              }
            }
          : node
      )
    }));
    
    // Mettre à jour les edges si nécessaire
    if (status === 'loading') {
      get().setCurrentNode(nodeId);
    }
  },

  updateNodeProgress: (nodeId: string, progress: number) => {
    set(state => ({
      nodes: state.nodes.map(node =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, progress } }
          : node
      )
    }));
  },

  setNodeError: (nodeId: string, error: string) => {
    set(state => ({
      nodes: state.nodes.map(node =>
        node.id === nodeId
          ? { 
              ...node, 
              data: { 
                ...node.data, 
                status: 'error', 
                errorMessage: error,
                endTime: Date.now()
              }
            }
          : node
      ),
      error: {
        nodeId,
        message: error
      }
    }));
  },

  // Actions pour les edges
  updateEdgeData: (edgeId: string, data: any) => {
    set(state => ({
      edges: state.edges.map(edge =>
        edge.id === edgeId
          ? { ...edge, data: { ...edge.data, ...data } }
          : edge
      )
    }));
  },

  setEdgeTransferring: (edgeId: string, transferring: boolean, progress = 0) => {
    set(state => ({
      edges: state.edges.map(edge =>
        edge.id === edgeId
          ? { 
              ...edge, 
              data: { ...edge.data, transferring, transferProgress: progress },
              style: {
                ...edge.style,
                stroke: transferring ? '#10b981' : '#64748b',
                strokeWidth: transferring ? 3 : 2
              },
              animated: transferring
            }
          : edge
      )
    }));
  },

  // Contrôle du workflow
  startWorkflow: async (config: WorkflowConfig) => {
    const workflowId = uuidv4();
    const startTime = Date.now();
    
    // Calculer le coût estimé total
    const estimatedCost = get().nodes.reduce((total, node) => 
      total + (node.data.config?.costCredits || 0), 0
    );

    set(state => ({
      workflowId,
      isRunning: true,
      isPaused: false,
      startTime,
      estimatedTotalCost: estimatedCost,
      overallProgress: 0,
      currentStep: 1,
      error: undefined,
      result: undefined,
      // Réinitialiser les nœuds
      nodes: state.nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          status: 'idle',
          progress: 0,
          errorMessage: undefined,
          startTime: undefined,
          endTime: undefined
        }
      }))
    }));

    // Setup service event listeners
    const handleProgress = (data: { nodeId: string; progress: number; status: WorkflowNodeStatus }) => {
      get().updateNodeStatus(data.nodeId, data.status);
      get().updateNodeProgress(data.nodeId, data.progress);
    };

    const handleNodeComplete = (data: { nodeId: string; result: any }) => {
      get().updateNodeData(data.nodeId, { output: data.result });
      
      // Animate edge transfer to next node
      const edges = get().edges;
      const edge = edges.find(e => e.source === data.nodeId);
      if (edge) {
        get().setEdgeTransferring(edge.id, true);
        setTimeout(() => get().setEdgeTransferring(edge.id, false), 1000);
      }
    };

    const handleComplete = (result: any) => {
      set(state => ({
        isRunning: false,
        endTime: Date.now(),
        overallProgress: 100,
        result: {
          imageUrl: result.imageUrl,
          videoUrl: result.videoUrl,
          metadata: result.metadata
        },
        executionHistory: [
          ...state.executionHistory,
          {
            id: workflowId,
            startTime,
            endTime: Date.now(),
            status: 'completed',
            config,
            result: {
              imageUrl: result.imageUrl,
              videoUrl: result.videoUrl,
              totalCreditsUsed: state.totalCreditsUsed,
              executionTime: Date.now() - startTime
            }
          }
        ]
      }));
    };

    const handleError = (data: { nodeId: string; error: string }) => {
      get().setNodeError(data.nodeId, data.error);
      set(state => ({
        isRunning: false,
        endTime: Date.now(),
        error: {
          nodeId: data.nodeId,
          message: data.error
        },
        executionHistory: [
          ...state.executionHistory,
          {
            id: workflowId,
            startTime,
            status: 'failed',
            config,
            error: {
              nodeId: data.nodeId,
              message: data.error
            }
          }
        ]
      }));
    };

    // Register event listeners
    workflowService.on('workflow:progress', handleProgress);
    workflowService.on('workflow:nodeComplete', handleNodeComplete);
    workflowService.on('workflow:complete', handleComplete);
    workflowService.on('workflow:error', handleError);

    try {
      // Start the real workflow with backend service
      const response = await workflowService.startWorkflow(config);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to start workflow');
      }

      // Update workflow ID with the backend job ID
      set({ workflowId: response.jobId });

    } catch (error) {
      console.error('Workflow startup failed:', error);
      
      // Clean up event listeners
      workflowService.off('workflow:progress', handleProgress);
      workflowService.off('workflow:nodeComplete', handleNodeComplete);
      workflowService.off('workflow:complete', handleComplete);
      workflowService.off('workflow:error', handleError);

      set(state => ({
        isRunning: false,
        endTime: Date.now(),
        error: {
          nodeId: NODE_IDS.PROMPT,
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }));
    }
  },

  // Exécution d'un nœud individuel (à implémenter avec les services backend)
  executeNode: async (nodeId: string, input: any) => {
    const { updateNodeStatus, updateNodeProgress, setNodeError } = get();
    
    updateNodeStatus(nodeId, 'loading');
    updateNodeProgress(nodeId, 0);

    try {
      // Simulation d'exécution pour l'instant
      // TODO: Intégrer avec les services backend réels
      await new Promise(resolve => setTimeout(resolve, 2000));
      updateNodeProgress(nodeId, 100);
      updateNodeStatus(nodeId, 'success');
      
      // Simuler la sortie du nœud
      const mockOutput = {
        [NODE_IDS.PROMPT]: input.input,
        [NODE_IDS.ENHANCE]: `Enhanced: ${input.prompt}`,
        [NODE_IDS.IMAGE]: { imageUrl: 'https://example.com/image.jpg' },
        [NODE_IDS.VIDEO]: { videoUrl: 'https://example.com/video.mp4' },
        [NODE_IDS.OUTPUT]: { finalVideoUrl: 'https://example.com/final.mp4' }
      };

      get().updateNodeData(nodeId, { output: mockOutput[nodeId] });

    } catch (error) {
      setNodeError(nodeId, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  },

  pauseWorkflow: async () => {
    const response = await workflowService.pauseWorkflow();
    if (response.success) {
      set({ isPaused: true });
    }
    return response;
  },

  resumeWorkflow: async () => {
    const response = await workflowService.resumeWorkflow();
    if (response.success) {
      set({ isPaused: false });
    }
    return response;
  },

  cancelWorkflow: async () => {
    const response = await workflowService.cancelWorkflow();
    set(state => ({
      isRunning: false,
      isPaused: false,
      endTime: Date.now(),
      executionHistory: [
        ...state.executionHistory,
        {
          id: state.workflowId || uuidv4(),
          startTime: state.startTime || Date.now(),
          status: 'cancelled',
          config: {} as WorkflowConfig // TODO: Store config in state
        }
      ]
    }));
    return response;
  },

  resetWorkflow: () => {
    set({
      nodes: createInitialNodes(),
      edges: createInitialEdges(),
      isRunning: false,
      isPaused: false,
      overallProgress: 0,
      currentStep: 0,
      totalCreditsUsed: 0,
      workflowId: undefined,
      currentNodeId: undefined,
      startTime: undefined,
      endTime: undefined,
      result: undefined,
      error: undefined
    });
  },

  // Gestion de l'état
  setCurrentNode: (nodeId: string) => {
    set({ currentNodeId: nodeId });
    
    // Mettre à jour le step actuel basé sur le nœud
    const stepMap = {
      [NODE_IDS.PROMPT]: 1,
      [NODE_IDS.ENHANCE]: 2,
      [NODE_IDS.IMAGE]: 3,
      [NODE_IDS.VIDEO]: 4,
      [NODE_IDS.OUTPUT]: 5
    };
    
    set({ currentStep: stepMap[nodeId] || 0 });
    
    // Mettre à jour la progression globale
    const progress = ((stepMap[nodeId] || 0) / 5) * 100;
    set({ overallProgress: progress });
  },

  updateOverallProgress: (progress: number) => {
    set({ overallProgress: progress });
  },

  setWorkflowResult: (result: any) => {
    set({ result });
  },

  setWorkflowError: (error: { nodeId: string; message: string; code?: string }) => {
    set({ error });
  },

  // Utilitaires
  getNodeById: (nodeId: string) => {
    return get().nodes.find(node => node.id === nodeId);
  },

  getEdgeById: (edgeId: string) => {
    return get().edges.find(edge => edge.id === edgeId);
  },

  isNodeCompleted: (nodeId: string) => {
    const node = get().getNodeById(nodeId);
    return node?.data.status === 'success';
  },

  canExecuteNode: (nodeId: string) => {
    const node = get().getNodeById(nodeId);
    if (!node) return false;

    // Le premier nœud peut toujours être exécuté
    if (nodeId === NODE_IDS.PROMPT) return true;

    // Pour les autres nœuds, vérifier que les nœuds précédents sont terminés
    const nodeOrder = [NODE_IDS.PROMPT, NODE_IDS.ENHANCE, NODE_IDS.IMAGE, NODE_IDS.VIDEO, NODE_IDS.OUTPUT];
    const currentIndex = nodeOrder.indexOf(nodeId);
    
    if (currentIndex === -1) return false;

    // Vérifier que tous les nœuds précédents sont terminés
    for (let i = 0; i < currentIndex; i++) {
      if (!get().isNodeCompleted(nodeOrder[i])) {
        return false;
      }
    }

    return true;
  }
}));