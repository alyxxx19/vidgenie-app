/**
 * Utilitaires d'accessibilité WCAG 2.1 AA/AAA
 * PHASE 6.2 - Accessibilité complète
 */

import { secureLog } from './secure-logger';

// Types pour l'accessibilité
export interface AccessibilityOptions {
  level: 'AA' | 'AAA';
  preferReducedMotion: boolean;
  highContrast: boolean;
  fontSize: 'small' | 'normal' | 'large' | 'extra-large';
  colorBlindnessType?: 'protanopia' | 'deuteranopia' | 'tritanopia' | 'none';
}

export interface ColorContrastResult {
  ratio: number;
  passesAA: boolean;
  passesAAA: boolean;
  passesAALarge: boolean;
  passesAAALarge: boolean;
}

export interface FocusableElement {
  element: HTMLElement;
  tabIndex: number;
  isVisible: boolean;
  isInteractive: boolean;
}

/**
 * Calcul du ratio de contraste entre deux couleurs selon WCAG
 */
export function calculateContrastRatio(foreground: string, background: string): ColorContrastResult {
  const getLuminance = (color: string): number => {
    // Convertir la couleur en RGB
    const rgb = hexToRgb(color) || { r: 0, g: 0, b: 0 };
    
    // Calcul de la luminance relative
    const rsRGB = rgb.r / 255;
    const gsRGB = rgb.g / 255;
    const bsRGB = rgb.b / 255;

    const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
    const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
    const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

  return {
    ratio: Math.round(ratio * 100) / 100,
    passesAA: ratio >= 4.5,
    passesAAA: ratio >= 7,
    passesAALarge: ratio >= 3,
    passesAAALarge: ratio >= 4.5,
  };
}

/**
 * Convertit une couleur hex en RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Détecte les préférences d'accessibilité du système
 */
export function detectAccessibilityPreferences(): Partial<AccessibilityOptions> {
  if (typeof window === 'undefined') return {};

  const preferences: Partial<AccessibilityOptions> = {};

  // Détection du mouvement réduit
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    preferences.preferReducedMotion = true;
  }

  // Détection du contraste élevé
  if (window.matchMedia('(prefers-contrast: high)').matches) {
    preferences.highContrast = true;
  }

  // Détection de la taille de police préférée
  if (window.matchMedia('(prefers-reduced-data: reduce)').matches) {
    preferences.fontSize = 'small';
  }

  return preferences;
}

/**
 * Applique les préférences d'accessibilité au DOM
 */
export function applyAccessibilityPreferences(options: Partial<AccessibilityOptions>): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // Mouvement réduit
  if (options.preferReducedMotion) {
    root.style.setProperty('--animation-duration', '0ms');
    root.style.setProperty('--transition-duration', '0ms');
    root.classList.add('reduce-motion');
  }

  // Contraste élevé
  if (options.highContrast) {
    root.classList.add('high-contrast');
  }

  // Taille de police
  if (options.fontSize) {
    root.classList.remove('font-small', 'font-normal', 'font-large', 'font-extra-large');
    root.classList.add(`font-${options.fontSize}`);
  }

  secureLog.debug('Accessibility preferences applied', options);
}

/**
 * Audit d'accessibilité automatique d'un élément
 */
export function auditElementAccessibility(element: HTMLElement): {
  errors: string[];
  warnings: string[];
  passed: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const passed: string[] = [];

  // Vérification des images
  if (element.tagName === 'IMG') {
    const img = element as HTMLImageElement;
    if (!img.alt && img.alt !== '') {
      errors.push('Image sans attribut alt');
    } else if (img.alt.trim() === '') {
      warnings.push('Image avec alt vide - assurez-vous que c\'est décoratif');
    } else {
      passed.push('Image avec alt approprié');
    }
  }

  // Vérification des liens
  if (element.tagName === 'A') {
    const link = element as HTMLAnchorElement;
    if (!link.textContent?.trim() && !link.getAttribute('aria-label')) {
      errors.push('Lien sans texte ou aria-label');
    } else {
      passed.push('Lien avec texte approprié');
    }

    if (link.href && link.href.startsWith('http') && !link.target) {
      warnings.push('Lien externe sans indication');
    }
  }

  // Vérification des boutons
  if (element.tagName === 'BUTTON' || element.getAttribute('role') === 'button') {
    if (!element.textContent?.trim() && !element.getAttribute('aria-label')) {
      errors.push('Bouton sans texte ou aria-label');
    } else {
      passed.push('Bouton avec libellé approprié');
    }
  }

  // Vérification des champs de formulaire
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName)) {
    const input = element as HTMLInputElement;
    const hasLabel = document.querySelector(`label[for="${input.id}"]`) || 
                    input.getAttribute('aria-label') ||
                    input.getAttribute('aria-labelledby');
    
    if (!hasLabel) {
      errors.push('Champ de formulaire sans libellé');
    } else {
      passed.push('Champ de formulaire avec libellé');
    }

    if (input.required && !input.getAttribute('aria-required')) {
      warnings.push('Champ requis sans aria-required');
    }
  }

  // Vérification des titres
  if (element.tagName.match(/^H[1-6]$/)) {
    if (!element.textContent?.trim()) {
      errors.push('Titre vide');
    } else {
      passed.push('Titre avec contenu');
    }
  }

  // Vérification du contraste (si couleurs définies)
  const computedStyle = window.getComputedStyle(element);
  const color = computedStyle.color;
  const backgroundColor = computedStyle.backgroundColor;
  
  if (color && backgroundColor && color !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
    const contrastResult = calculateContrastRatio(color, backgroundColor);
    if (!contrastResult.passesAA) {
      errors.push(`Contraste insuffisant: ${contrastResult.ratio}:1 (minimum 4.5:1)`);
    } else {
      passed.push(`Contraste suffisant: ${contrastResult.ratio}:1`);
    }
  }

  // Vérification de la taille de cible tactile
  const rect = element.getBoundingClientRect();
  if (element.matches('button, input, a, [role="button"], [tabindex]')) {
    if (rect.width < 44 || rect.height < 44) {
      warnings.push(`Cible tactile trop petite: ${rect.width}×${rect.height}px (minimum 44×44px)`);
    } else {
      passed.push('Taille de cible tactile appropriée');
    }
  }

  return { errors, warnings, passed };
}

/**
 * Audit d'accessibilité de toute une page
 */
export function auditPageAccessibility(): {
  errors: string[];
  warnings: string[];
  passed: string[];
  score: number;
} {
  if (typeof document === 'undefined') {
    return { errors: [], warnings: [], passed: [], score: 100 };
  }

  const allErrors: string[] = [];
  const allWarnings: string[] = [];
  const allPassed: string[] = [];

  // Vérifications globales
  const title = document.querySelector('title');
  if (!title || !title.textContent?.trim()) {
    allErrors.push('Page sans titre');
  } else {
    allPassed.push('Page avec titre');
  }

  // Vérification de la langue
  if (!document.documentElement.lang) {
    allErrors.push('Document sans attribut lang');
  } else {
    allPassed.push('Document avec langue définie');
  }

  // Vérification de la structure des titres
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  if (headings.length === 0) {
    allWarnings.push('Page sans structure de titres');
  } else {
    const h1Count = document.querySelectorAll('h1').length;
    if (h1Count !== 1) {
      allWarnings.push(`${h1Count} éléments H1 trouvés (devrait être 1)`);
    } else {
      allPassed.push('Structure H1 correcte');
    }
  }

  // Audit de tous les éléments interactifs
  const interactiveElements = document.querySelectorAll(
    'a, button, input, select, textarea, [tabindex], [role="button"], [role="link"]'
  );

  interactiveElements.forEach(el => {
    const result = auditElementAccessibility(el as HTMLElement);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
    allPassed.push(...result.passed);
  });

  // Vérification de l'ordre de tabulation
  const focusableElements = getFocusableElements();
  const tabIndexIssues = focusableElements.filter(el => 
    el.tabIndex > 0 && el.tabIndex !== el.element.tabIndex
  );
  
  if (tabIndexIssues.length > 0) {
    allWarnings.push(`${tabIndexIssues.length} éléments avec tabindex positif détectés`);
  }

  // Calcul du score
  const totalChecks = allErrors.length + allWarnings.length + allPassed.length;
  const score = totalChecks > 0 
    ? Math.round(((allPassed.length + allWarnings.length * 0.5) / totalChecks) * 100)
    : 100;

  return {
    errors: Array.from(new Set(allErrors)),
    warnings: Array.from(new Set(allWarnings)),
    passed: Array.from(new Set(allPassed)),
    score
  };
}

/**
 * Obtient tous les éléments focusables de la page
 */
export function getFocusableElements(): FocusableElement[] {
  if (typeof document === 'undefined') return [];

  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    'details',
    'summary',
  ].join(', ');

  const elements = Array.from(document.querySelectorAll(focusableSelectors)) as HTMLElement[];

  return elements.map(element => ({
    element,
    tabIndex: element.tabIndex,
    isVisible: isElementVisible(element),
    isInteractive: isElementInteractive(element),
  })).filter(item => item.isVisible);
}

/**
 * Vérifie si un élément est visible
 */
function isElementVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && 
         style.visibility !== 'hidden' && 
         style.opacity !== '0' &&
         element.offsetWidth > 0 && 
         element.offsetHeight > 0;
}

/**
 * Vérifie si un élément est interactif
 */
function isElementInteractive(element: HTMLElement): boolean {
  const interactiveTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'DETAILS', 'SUMMARY'];
  const interactiveRoles = ['button', 'link', 'textbox', 'listbox', 'tab', 'menuitem'];
  
  return interactiveTags.includes(element.tagName) ||
         interactiveRoles.includes(element.getAttribute('role') || '') ||
         element.hasAttribute('onclick') ||
         element.tabIndex >= 0;
}

/**
 * Gestionnaire de focus pour améliorer l'accessibilité clavier
 */
export class FocusManager {
  private focusHistory: HTMLElement[] = [];
  private trapStack: HTMLElement[] = [];

  /**
   * Piège le focus dans un container
   */
  trapFocus(container: HTMLElement): void {
    this.trapStack.push(container);
    
    const focusableElements = this.getFocusableInContainer(container);
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeydown);
    
    // Stocker le gestionnaire pour pouvoir le supprimer
    (container as any).__focusTrapHandler = handleKeydown;
    
    // Focus sur le premier élément
    firstElement.focus();
  }

  /**
   * Libère le piège de focus
   */
  releaseFocusTrap(container?: HTMLElement): void {
    const targetContainer = container || this.trapStack.pop();
    if (!targetContainer) return;

    const handler = (targetContainer as any).__focusTrapHandler;
    if (handler) {
      targetContainer.removeEventListener('keydown', handler);
      delete (targetContainer as any).__focusTrapHandler;
    }

    // Restaurer le focus précédent
    const previousFocus = this.focusHistory.pop();
    if (previousFocus && document.contains(previousFocus)) {
      previousFocus.focus();
    }
  }

  /**
   * Sauvegarde le focus actuel
   */
  saveFocus(): void {
    if (document.activeElement instanceof HTMLElement) {
      this.focusHistory.push(document.activeElement);
    }
  }

  /**
   * Restaure le focus sauvegardé
   */
  restoreFocus(): void {
    const previousFocus = this.focusHistory.pop();
    if (previousFocus && document.contains(previousFocus)) {
      previousFocus.focus();
    }
  }

  private getFocusableInContainer(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    return Array.from(container.querySelectorAll(focusableSelectors))
      .filter(el => isElementVisible(el as HTMLElement)) as HTMLElement[];
  }
}

/**
 * Instance globale du gestionnaire de focus
 */
export const focusManager = new FocusManager();

/**
 * Hook React pour l'accessibilité
 */
export function useAccessibility(options?: Partial<AccessibilityOptions>) {
  if (typeof window === 'undefined') return {};

  // Détection automatique des préférences si non spécifiées
  const preferences = { 
    ...detectAccessibilityPreferences(),
    ...options 
  };

  // Application des préférences
  if (Object.keys(preferences).length > 0) {
    applyAccessibilityPreferences(preferences);
  }

  return {
    preferences,
    auditPage: auditPageAccessibility,
    focusManager,
    calculateContrastRatio,
  };
}

/**
 * Composant wrapper pour l'annonce aux lecteurs d'écran
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  if (typeof document === 'undefined') return;

  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Supprimer l'élément après annonce
  setTimeout(() => {
    if (document.body.contains(announcement)) {
      document.body.removeChild(announcement);
    }
  }, 1000);
}

/**
 * Génère des styles CSS pour l'accessibilité
 */
export function generateAccessibilityCSS(): string {
  return `
    /* Classes utilitaires d'accessibilité */
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    .skip-link {
      position: absolute;
      top: -40px;
      left: 6px;
      background: #000;
      color: #fff;
      padding: 8px;
      z-index: 1000;
      text-decoration: none;
      border-radius: 0 0 4px 4px;
    }

    .skip-link:focus {
      top: 0;
    }

    /* Focus visible amélioré */
    .focus-visible:focus {
      outline: 2px solid #005fcc;
      outline-offset: 2px;
    }

    /* Préférences utilisateur */
    .reduce-motion * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }

    .high-contrast {
      filter: contrast(150%);
    }

    .font-small {
      font-size: 0.875rem;
    }

    .font-large {
      font-size: 1.125rem;
    }

    .font-extra-large {
      font-size: 1.25rem;
    }

    /* Amélioration du contraste pour les états */
    button:focus-visible,
    input:focus-visible,
    select:focus-visible,
    textarea:focus-visible {
      outline: 3px solid #005fcc;
      outline-offset: 2px;
    }

    /* Cibles tactiles minimales */
    button, input, select, textarea, a {
      min-height: 44px;
      min-width: 44px;
    }

    /* Mode sombre accessible */
    @media (prefers-color-scheme: dark) {
      :root {
        --text-color: #ffffff;
        --bg-color: #000000;
        --link-color: #66b3ff;
      }
    }
  `;
}

export default {
  auditPageAccessibility,
  auditElementAccessibility,
  calculateContrastRatio,
  detectAccessibilityPreferences,
  applyAccessibilityPreferences,
  getFocusableElements,
  focusManager,
  announceToScreenReader,
  useAccessibility,
  generateAccessibilityCSS,
};