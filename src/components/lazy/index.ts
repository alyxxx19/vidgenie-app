/**
 * Index pour tous les composants lazy-loadés
 * PHASE 3.1 - Code Splitting & Performance Frontend
 */

import { lazy } from 'react';

// Dashboard Components - Chargés à la demande
// export const LazyContentCalendar = lazy(() =>
//   import('@/components/content-calendar').then(module => ({
//     default: module.default
//   }))
// );

// export const LazyContentHistory = lazy(() =>
//   import('@/components/content-history').then(module => ({
//     default: module.default
//   }))
// );

// Workflow Components - Très lourds, chargés uniquement si nécessaires
export const LazyWorkflowCanvas = lazy(() =>
  import('@/components/workflow/WorkflowCanvas').then(module => ({
    default: module.WorkflowCanvas
  }))
);

// WorkflowControls component doesn't export properly, commented out for now
// export const LazyWorkflowControls = lazy(() =>
//   import('@/components/workflow/WorkflowControls').then(module => ({
//     default: module.default
//   }))
// );

// WorkflowVisualizer component doesn't export properly, commented out for now
// export const LazyWorkflowVisualizer = lazy(() =>
//   import('@/components/workflow-visualizer').then(module => ({
//     default: module.default
//   }))
// );

// Video Components - Chargés pour les pages de création
// Video components
export const LazyVideoTemplateShowcase = lazy(() =>
  import('@/components/video-template-showcase').then(module => ({
    default: module.VideoTemplateShowcase
  }))
);

export const LazyVideoPromptBuilder = lazy(() =>
  import('@/components/video-prompt-builder').then(module => ({
    default: module.VideoPromptBuilder
  }))
);

// Prompt Builder Components
export const LazyPromptBuilder = lazy(() =>
  import('@/components/prompt-builder').then(module => ({
    default: module.PromptBuilder
  }))
);

// Workflow Components
// export const LazyWorkflowInterface = lazy(() =>
//   import('@/components/workflow-interface').then(module => ({
//     default: module.WorkflowInterface
//   }))
// );

export const LazyWorkflowInterfaceV2 = lazy(() =>
  import('@/components/workflow/workflow-interface-v2').then(module => ({
    default: module.WorkflowInterfaceV2
  }))
);

export const LazyWorkflowStepsVisualizer = lazy(() =>
  import('@/components/workflow-steps-visualizer').then(module => ({
    default: module.WorkflowStepsVisualizer
  }))
);

export const LazyWorkflowTypeSelector = lazy(() =>
  import('@/components/workflow/WorkflowTypeSelector').then(module => ({
    default: module.WorkflowTypeSelector
  }))
);

// Settings Components - Chargés uniquement dans les pages de configuration
export const LazyApiKeysSection = lazy(() =>
  import('@/components/settings/ApiKeysSection').then(module => ({
    default: module.ApiKeysSection
  }))
);

// UI Components lourds
export const LazyAvatarUpload = lazy(() =>
  import('@/components/ui/avatar-upload').then(module => ({
    default: module.AvatarUpload
  }))
);

// Commented out due to export issues
// export const LazyAccessibilityChecker = lazy(() =>
//   import('@/components/ui/accessibility-checker').then(module => ({
//     default: module.default
//   }))
// );

// Charts et Analytics - Très lourds
// export const LazyChart = lazy(() =>
//   import('@/components/chart').then(module => ({
//     default: module.default
//   }))
// );

// Modals - Chargés uniquement à l'ouverture
// export const LazyChangePasswordModal = lazy(() =>
//   import('@/components/ui/change-password-modal').then(module => ({
//     default: module.default
//   }))
// );

export const LazyTwoFactorModal = lazy(() =>
  import('@/components/ui/two-factor-modal').then(module => ({
    default: module.TwoFactorModal
  }))
);

// Préchargement intelligent basé sur la route
export const preloadComponentsByRoute = (pathname: string) => {
  switch (true) {
    case pathname.includes('/dashboard'):
      // Précharger les composants dashboard critiques après 2s
      setTimeout(() => {
        import('@/components/content-calendar');
        import('@/components/content-history');
      }, 2000);
      break;

    case pathname.includes('/create'):
      // Précharger les composants de création
      setTimeout(() => {
        import('@/components/video-template-showcase');
        import('@/components/video-prompt-builder');
        import('@/components/prompt-builder');
        import('@/components/workflow-interface');
        import('@/components/workflow/workflow-interface-v2');
        import('@/components/workflow-steps-visualizer');
        import('@/components/workflow/WorkflowTypeSelector');
        import('@/components/workflow/WorkflowCanvas');
      }, 1000);
      break;

    case pathname.includes('/settings'):
      // Précharger les composants settings
      setTimeout(() => {
        import('@/components/settings/ApiKeysSection');
        import('@/components/ui/avatar-upload');
      }, 1500);
      break;

    case pathname.includes('/workflow'):
      // Précharger tous les composants workflow
      setTimeout(() => {
        import('@/components/workflow/WorkflowCanvas');
        import('@/components/workflow/WorkflowControls');
        import('@/components/workflow-visualizer');
      }, 500);
      break;

    default:
      break;
  }
};

// Fonction utilitaire pour le preloading conditionnel
export const preloadComponent = (
  importFn: () => Promise<any>,
  condition: boolean,
  delay = 0
) => {
  if (condition) {
    setTimeout(() => {
      importFn().catch(() => {
        // Ignore les erreurs de preloading
      });
    }, delay);
  }
};

export default {
  // LazyContentCalendar, // Commented out due to export issues
  // LazyContentHistory, // Commented out due to export issues
  LazyWorkflowCanvas,
  // LazyWorkflowControls, // Commented out due to export issues
  // LazyWorkflowVisualizer, // Commented out due to export issues
  LazyVideoTemplateShowcase,
  LazyVideoPromptBuilder,
  LazyPromptBuilder,
  // LazyWorkflowInterface, // Commented out due to export issues
  LazyWorkflowInterfaceV2,
  LazyWorkflowStepsVisualizer,
  LazyWorkflowTypeSelector,
  LazyApiKeysSection,
  LazyAvatarUpload,
  // LazyAccessibilityChecker, // Commented out due to export issues
  // LazyChart, // Commented out due to export issues
  // LazyChangePasswordModal, // Commented out due to export issues
  LazyTwoFactorModal,
  preloadComponentsByRoute,
  preloadComponent,
};