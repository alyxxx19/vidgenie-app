'use client';

import { WorkflowCanvas } from './WorkflowCanvas';
import { WorkflowControls } from './WorkflowControls';

export interface WorkflowInterfaceV2Props {
  className?: string;
  projectId?: string;
}

export function WorkflowInterfaceV2({ className, projectId }: WorkflowInterfaceV2Props) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Main workflow canvas with node-based interface */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column - Controls */}
        <div className="lg:col-span-1">
          <WorkflowControls projectId={projectId} />
        </div>
        
        {/* Right columns - Canvas */}
        <div className="lg:col-span-2">
          <div className="h-[700px] border border-secondary rounded bg-card/50 backdrop-blur-sm">
            <WorkflowCanvas />
          </div>
        </div>
      </div>
    </div>
  );
}