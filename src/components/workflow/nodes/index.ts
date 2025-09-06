// Export all workflow nodes
export { PromptNode } from './PromptNode';
export { EnhanceNode } from './EnhanceNode';
export { ImageGenNode } from './ImageGenNode';
export { VideoGenNode } from './VideoGenNode';
export { OutputNode } from './OutputNode';
export { ImageUploadNode } from './ImageUploadNode';

// Node type mapping for React Flow
import { PromptNode } from './PromptNode';
import { EnhanceNode } from './EnhanceNode';
import { ImageGenNode } from './ImageGenNode';
import { VideoGenNode } from './VideoGenNode';
import { OutputNode } from './OutputNode';
import { ImageUploadNode } from './ImageUploadNode';

export const nodeTypes = {
  prompt: PromptNode,
  enhance: EnhanceNode,
  image: ImageGenNode,
  video: VideoGenNode,
  output: OutputNode,
  'image-upload': ImageUploadNode,
} as const;