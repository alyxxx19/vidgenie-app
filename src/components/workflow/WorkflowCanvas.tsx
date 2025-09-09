'use client';

import { useCallback, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';
import './styles/workflow-animations.css';

import { useWorkflowStore } from './store/workflow-store';
import { WorkflowNode, WorkflowEdge, NODE_TYPES } from './types/workflow';

// Import des composants de nœuds depuis l'index
import { nodeTypes } from './nodes';
import { secureLog } from '@/lib/secure-logger';

interface WorkflowCanvasProps {
  className?: string;
}

function WorkflowCanvasInner({ className }: WorkflowCanvasProps) {
  const { fitView } = useReactFlow();
  
  // État du store Zustand
  const { 
    nodes: storeNodes, 
    edges: storeEdges,
    updateNodeData,
    updateEdgeData 
  } = useWorkflowStore();

  // États React Flow
  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges);

  // Synchroniser avec le store Zustand
  useEffect(() => {
    setNodes(storeNodes);
  }, [storeNodes, setNodes]);

  useEffect(() => {
    setEdges(storeEdges);
  }, [storeEdges, setEdges]);

  // Gestionnaire de connexion (normalement pas utilisé car les connexions sont prédéfinies)
  const onConnect = useCallback(
    (params: Connection | Edge) => {
      setEdges((eds) => addEdge(params, eds));
    },
    [setEdges]
  );

  // Gestionnaire de sélection de nœud
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    secureLog.info('Node clicked:', node.id);
    
    // Ajouter effet visuel de sélection
    const nodeElement = event.currentTarget as HTMLElement;
    nodeElement.classList.add('workflow-node');
    
    // Focus sur le nœud sélectionné
    setTimeout(() => {
      const nodePosition = node.position;
      fitView({
        nodes: [{ id: node.id, position: nodePosition }] as Node[],
        duration: 800,
        padding: 0.3
      });
    }, 100);
  }, [fitView]);

  // Gestionnaire de drag des nœuds
  const onNodeDragStop = useCallback((event: React.MouseEvent, node: Node) => {
    // Mettre à jour la position dans le store si nécessaire
    secureLog.info('Node dragged:', { nodeId: node.id, position: node.position });
  }, []);

  // Fit view au chargement initial
  useEffect(() => {
    setTimeout(() => fitView(), 100);
  }, [fitView]);

  // Styles personnalisés pour les différents états d'edge
  const getEdgeStyle = (edge: WorkflowEdge) => {
    const baseStyle = edge.style || {};
    
    if (edge.data?.transferring) {
      return {
        ...baseStyle,
        stroke: '#10b981',
        strokeWidth: 3,
        strokeDasharray: '8',
        animation: 'flow 2s linear infinite'
      };
    }
    
    if (edge.data?.transferring) {
      return {
        ...baseStyle,
        stroke: '#3b82f6',
        strokeWidth: 2.5,
        transition: 'stroke 0.3s ease, stroke-width 0.3s ease'
      };
    }
    
    return {
      ...baseStyle,
      stroke: '#9ca3af',
      strokeWidth: 2,
      transition: 'stroke 0.3s ease, stroke-width 0.3s ease'
    };
  };

  return (
    <div className={`w-full h-full ${className}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges.map(edge => ({
          ...edge,
          style: getEdgeStyle(edge as WorkflowEdge)
        }))}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: true }}
        className="bg-cyber-gradient"
        minZoom={0.5}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
      >
        {/* Arrière-plan avec grille */}
        <Background 
          color="#404040" 
          gap={40} 
          size={1}
          style={{ opacity: 0.3 }}
        />
        
        {/* Contrôles de navigation */}
        <Controls 
          className="bg-card border-secondary shadow-lg"
          showInteractive={false}
        />
        
        {/* Mini-map */}
        <MiniMap 
          className="bg-card/80 backdrop-blur-sm border border-secondary rounded"
          nodeColor={(node) => {
            const workflowNode = node as WorkflowNode;
            switch (workflowNode.data.status) {
              case 'loading': return '#3b82f6';
              case 'success': return '#10b981';
              case 'error': return '#ef4444';
              default: return '#6b7280';
            }
          }}
          nodeStrokeWidth={2}
          nodeBorderRadius={8}
          maskColor="rgba(0, 0, 0, 0.2)"
          position="bottom-right"
        />
      </ReactFlow>

      {/* Styles CSS personnalisés pour les animations */}
      <style jsx global>{`
        @keyframes flow {
          0% {
            stroke-dasharray: 5;
            stroke-dashoffset: 10;
          }
          100% {
            stroke-dasharray: 5;
            stroke-dashoffset: 0;
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
          20%, 40%, 60%, 80% { transform: translateX(2px); }
        }

        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }

        /* Styles pour les nœuds en mode sélectionné */
        .react-flow__node.selected {
          box-shadow: 0 0 0 2px #3b82f6;
        }

        /* Styles pour les edges animés */
        .react-flow__edge-path {
          transition: stroke 0.3s ease, stroke-width 0.3s ease;
        }

        .react-flow__edge.animated .react-flow__edge-path {
          stroke-dasharray: 8;
          animation: flow 2s linear infinite;
        }

        /* Styles pour les handles */
        .react-flow__handle {
          transition: all 0.2s ease;
        }

        .react-flow__handle:hover {
          transform: scale(1.2);
        }

        /* Styles pour la mini-map */
        .react-flow__minimap {
          border-radius: 8px;
          overflow: hidden;
        }

        /* Styles pour les contrôles */
        .react-flow__controls {
          border-radius: 8px;
          overflow: hidden;
        }

        .react-flow__controls-button {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
          color: white;
          transition: all 0.2s ease;
        }

        .react-flow__controls-button:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.05);
        }

        /* Effets de glow pour les nœuds réussis */
        .glow-white {
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
        }

        /* Animation de pulsation pour les nœuds en cours */
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
}

export function WorkflowCanvas({ className }: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner className={className} />
    </ReactFlowProvider>
  );
}