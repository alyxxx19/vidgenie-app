'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Image, 
  Video, 
  Sparkles, 
  Shield, 
  Upload,
  ArrowRight,
  Zap,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface WorkflowNode {
  id: string;
  type: 'input' | 'process' | 'output';
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  position: { x: number; y: number };
  icon: keyof typeof NODE_ICONS;
  description: string;
}

interface WorkflowConnection {
  from: string;
  to: string;
  status: 'inactive' | 'active' | 'completed' | 'failed';
}

const NODE_ICONS = {
  shield: Shield,
  image: Image,
  upload: Upload,
  video: Video,
  sparkles: Sparkles,
  zap: Zap,
} as const;

const NODE_COLORS = {
  pending: {
    border: 'border-border',
    bg: 'bg-secondary/20',
    text: 'text-muted-foreground',
    icon: 'text-muted-foreground'
  },
  processing: {
    border: 'border-blue-500/60',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    icon: 'text-blue-400'
  },
  completed: {
    border: 'border-green-500/60',
    bg: 'bg-green-500/10',
    text: 'text-green-400',
    icon: 'text-green-400'
  },
  failed: {
    border: 'border-red-500/60',
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    icon: 'text-red-400'
  },
} as const;

const CONNECTION_COLORS = {
  inactive: 'stroke-border',
  active: 'stroke-blue-400 animate-pulse',
  completed: 'stroke-green-400',
  failed: 'stroke-red-400',
} as const;

export interface WorkflowCanvasProps {
  workflowId?: string;
  steps?: any[];
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export function WorkflowCanvas({ 
  workflowId, 
  steps = [], 
  isFullscreen = false, 
  onToggleFullscreen 
}: WorkflowCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [connections, setConnections] = useState<WorkflowConnection[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Initialize workflow nodes
  useEffect(() => {
    const workflowNodes: WorkflowNode[] = [
      {
        id: 'input',
        type: 'input',
        name: 'user_input',
        status: steps.length > 0 ? 'completed' : 'pending',
        progress: 100,
        position: { x: 50, y: 200 },
        icon: 'zap',
        description: 'Image and video prompts from user'
      },
      {
        id: 'validation',
        type: 'process',
        name: 'validation',
        status: steps.find(s => s.id === 'validation')?.status || 'pending',
        progress: steps.find(s => s.id === 'validation')?.progress || 0,
        position: { x: 200, y: 200 },
        icon: 'shield',
        description: 'Content safety and validation checks'
      },
      {
        id: 'image_generation',
        type: 'process',
        name: 'dalle_3_gen',
        status: steps.find(s => s.id === 'image_generation')?.status || 'pending',
        progress: steps.find(s => s.id === 'image_generation')?.progress || 0,
        position: { x: 350, y: 120 },
        icon: 'image',
        description: 'DALL-E 3 image generation from prompt'
      },
      {
        id: 'image_upload',
        type: 'process',
        name: 'image_upload',
        status: steps.find(s => s.id === 'image_upload')?.status || 'pending',
        progress: steps.find(s => s.id === 'image_upload')?.progress || 0,
        position: { x: 500, y: 120 },
        icon: 'upload',
        description: 'Upload generated image to storage'
      },
      {
        id: 'video_generation',
        type: 'process',
        name: 'veo3_gen',
        status: steps.find(s => s.id === 'video_generation')?.status || 'pending',
        progress: steps.find(s => s.id === 'video_generation')?.progress || 0,
        position: { x: 650, y: 200 },
        icon: 'video',
        description: 'VEO 3 video generation from image'
      },
      {
        id: 'video_upload',
        type: 'process',
        name: 'video_upload',
        status: steps.find(s => s.id === 'video_upload')?.status || 'pending',
        progress: steps.find(s => s.id === 'video_upload')?.progress || 0,
        position: { x: 800, y: 200 },
        icon: 'upload',
        description: 'Upload generated video to storage'
      },
      {
        id: 'finalization',
        type: 'output',
        name: 'completion',
        status: steps.find(s => s.id === 'finalization')?.status || 'pending',
        progress: steps.find(s => s.id === 'finalization')?.progress || 0,
        position: { x: 950, y: 200 },
        icon: 'sparkles',
        description: 'Workflow completion and cleanup'
      }
    ];

    const workflowConnections: WorkflowConnection[] = [
      { from: 'input', to: 'validation', status: getConnectionStatus('input', 'validation') },
      { from: 'validation', to: 'image_generation', status: getConnectionStatus('validation', 'image_generation') },
      { from: 'image_generation', to: 'image_upload', status: getConnectionStatus('image_generation', 'image_upload') },
      { from: 'image_upload', to: 'video_generation', status: getConnectionStatus('image_upload', 'video_generation') },
      { from: 'video_generation', to: 'video_upload', status: getConnectionStatus('video_generation', 'video_upload') },
      { from: 'video_upload', to: 'finalization', status: getConnectionStatus('video_upload', 'finalization') }
    ];

    setNodes(workflowNodes);
    setConnections(workflowConnections);
  }, [steps]);

  const getConnectionStatus = (fromId: string, toId: string): WorkflowConnection['status'] => {
    const fromStep = steps.find(s => s.id === fromId);
    const toStep = steps.find(s => s.id === toId);

    if (fromStep?.status === 'failed' || toStep?.status === 'failed') {
      return 'failed';
    }

    if (fromStep?.status === 'completed' && toStep?.status === 'completed') {
      return 'completed';
    }

    if (fromStep?.status === 'completed' && (toStep?.status === 'processing' || toStep?.status === 'pending')) {
      return 'active';
    }

    if (fromId === 'input' || fromStep?.status === 'completed') {
      return toStep?.status === 'processing' ? 'active' : 'inactive';
    }

    return 'inactive';
  };

  // Update canvas size
  useEffect(() => {
    const updateSize = () => {
      if (canvasRef.current) {
        setCanvasSize({
          width: canvasRef.current.offsetWidth,
          height: canvasRef.current.offsetHeight,
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [isFullscreen]);

  const getStatusIcon = (status: WorkflowNode['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'failed': return <XCircle className="w-4 h-4" />;
      case 'processing': return <RefreshCw className="w-4 h-4 animate-spin" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const renderNode = (node: WorkflowNode) => {
    const IconComponent = NODE_ICONS[node.icon];
    const colors = NODE_COLORS[node.status];

    return (
      <div
        key={node.id}
        className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
          node.status === 'processing' ? 'animate-pulse' : ''
        }`}
        style={{ 
          left: `${node.position.x}px`, 
          top: `${node.position.y}px` 
        }}
      >
        {/* Node Container */}
        <div className={`relative p-2 sm:p-4 rounded-lg border-2 ${colors.border} ${colors.bg} backdrop-blur-sm min-w-[80px] sm:min-w-[120px]`}>
          {/* Processing Ring */}
          {node.status === 'processing' && (
            <div className="absolute -inset-1 rounded-lg border-2 border-blue-400/30 animate-ping" />
          )}

          {/* Node Header */}
          <div className="flex items-center gap-2 mb-2">
            <div className={`flex-shrink-0 ${colors.icon}`}>
              <IconComponent className="w-5 h-5" />
            </div>
            <div className="flex-shrink-0">
              {getStatusIcon(node.status)}
            </div>
          </div>

          {/* Node Content */}
          <div className="space-y-1 sm:space-y-2">
            <div className={`font-mono text-xs sm:text-sm ${colors.text} font-medium`}>
              {node.name}
            </div>
            <div className="text-xs text-muted-foreground font-mono hidden sm:block">
              {node.description}
            </div>

            {/* Progress Bar */}
            {node.status === 'processing' && node.progress > 0 && (
              <div className="space-y-1">
                <div className="w-full bg-border rounded-full h-1">
                  <div 
                    className="bg-blue-400 h-1 rounded-full transition-all duration-300"
                    style={{ width: `${node.progress}%` }}
                  />
                </div>
                <div className="text-xs text-blue-400 font-mono text-center">
                  {node.progress}%
                </div>
              </div>
            )}

            {/* Status Badge */}
            <Badge className={`text-xs font-mono ${
              node.status === 'completed' ? 'bg-green-500/20 text-green-400' :
              node.status === 'processing' ? 'bg-blue-500/20 text-blue-400' :
              node.status === 'failed' ? 'bg-red-500/20 text-red-400' :
              'bg-muted text-muted-foreground'
            }`}>
              {node.status}
            </Badge>
          </div>
        </div>
      </div>
    );
  };

  const renderConnection = (connection: WorkflowConnection) => {
    const fromNode = nodes.find(n => n.id === connection.from);
    const toNode = nodes.find(n => n.id === connection.to);

    if (!fromNode || !toNode) return null;

    const x1 = fromNode.position.x + 60; // Adjust for node width
    const y1 = fromNode.position.y;
    const x2 = toNode.position.x - 60; // Adjust for node width  
    const y2 = toNode.position.y;

    const midX = (x1 + x2) / 2;
    const pathD = `M ${x1} ${y1} Q ${midX} ${y1} ${midX} ${(y1 + y2) / 2} Q ${midX} ${y2} ${x2} ${y2}`;

    return (
      <g key={`${connection.from}-${connection.to}`}>
        {/* Connection Path */}
        <path
          d={pathD}
          fill="none"
          strokeWidth={2}
          className={`transition-all duration-300 ${CONNECTION_COLORS[connection.status]}`}
          markerEnd="url(#arrowhead)"
        />
        
        {/* Data Flow Animation */}
        {connection.status === 'active' && (
          <circle r="3" className="fill-blue-400">
            <animateMotion dur="2s" repeatCount="indefinite">
              <mpath href={`#path-${connection.from}-${connection.to}`} />
            </animateMotion>
          </circle>
        )}
        
        {/* Hidden path for animation */}
        <path
          id={`path-${connection.from}-${connection.to}`}
          d={pathD}
          fill="none"
          strokeWidth={0}
        />
      </g>
    );
  };

  return (
    <Card className={`${isFullscreen ? 'fixed inset-0 z-50' : ''} bg-card border-border`}>
      <div className="border-b border-border bg-secondary/50">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 bg-white rounded flex-shrink-0">
              <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-black" />
            </div>
            <div className="min-w-0">
              <h3 className="font-mono text-xs sm:text-sm text-white truncate">workflow_canvas</h3>
              <p className="text-xs text-muted-foreground font-mono hidden sm:block">visual pipeline execution</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge className="bg-muted text-muted-foreground font-mono text-xs hidden sm:inline-flex">
              real-time
            </Badge>
            {onToggleFullscreen && (
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleFullscreen}
                className="h-7 w-7 sm:h-8 sm:w-8 p-0 border-border hover:border-white/40"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-3 h-3 sm:w-4 sm:h-4" />
                ) : (
                  <Maximize2 className="w-3 h-3 sm:w-4 sm:h-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
      
      <CardContent className="p-0">
        <div 
          ref={canvasRef}
          className={`relative bg-background overflow-hidden ${
            isFullscreen ? 'h-[calc(100vh-60px)] sm:h-[calc(100vh-80px)]' : 'h-[300px] sm:h-[400px]'
          }`}
        >
          {/* Background Grid */}
          <div className="absolute inset-0 opacity-20">
            <div className="bg-grid-pattern w-full h-full" />
          </div>

          {/* SVG for Connections */}
          <svg 
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 1 }}
          >
            {/* Arrow Marker */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  className="fill-current text-border"
                />
              </marker>
            </defs>
            
            {/* Render Connections */}
            {connections.map(renderConnection)}
          </svg>

          {/* Workflow Nodes */}
          <div className="absolute inset-0" style={{ zIndex: 2 }}>
            {nodes.map(renderNode)}
          </div>

          {/* Legend */}
          <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-2 sm:p-3" style={{ zIndex: 3 }}>
            <div className="text-xs text-muted-foreground font-mono mb-1 sm:mb-2 hidden sm:block">pipeline_status:</div>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3 text-xs font-mono">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground truncate">pending</span>
              </div>
              <div className="flex items-center gap-1">
                <RefreshCw className="w-3 h-3 text-blue-400 flex-shrink-0" />
                <span className="text-blue-400 truncate">active</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
                <span className="text-green-400 truncate">done</span>
              </div>
              <div className="flex items-center gap-1">
                <XCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
                <span className="text-red-400 truncate">failed</span>
              </div>
            </div>
          </div>

          {/* Workflow ID */}
          {workflowId && (
            <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-2 sm:p-3" style={{ zIndex: 3 }}>
              <div className="text-xs text-muted-foreground font-mono mb-1 hidden sm:block">workflow_id:</div>
              <div className="text-xs text-white font-mono">{workflowId.slice(0, isFullscreen ? 16 : 8)}...</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}