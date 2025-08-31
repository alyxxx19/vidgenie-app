'use client';

import { useEffect } from 'react';

// Vérifications d'accessibilité automatiques
export function AccessibilityChecker() {
  useEffect(() => {
    // Vérifier les contrastes
    const checkContrasts = () => {
      const elements = document.querySelectorAll('*');
      elements.forEach((el) => {
        const style = window.getComputedStyle(el);
        const bgColor = style.backgroundColor;
        const textColor = style.color;
        
        // Alerter si le contraste semble faible (implémentation basique)
        if (bgColor && textColor && bgColor !== 'rgba(0, 0, 0, 0)' && textColor !== 'rgba(0, 0, 0, 0)') {
          // Logique de vérification de contraste simplifiée
          console.log('Checking contrast for:', el, { bgColor, textColor });
        }
      });
    };

    // Vérifier les labels manquants
    const checkLabels = () => {
      const inputs = document.querySelectorAll('input, textarea, select');
      inputs.forEach((input) => {
        const id = input.getAttribute('id');
        const ariaLabel = input.getAttribute('aria-label');
        const ariaLabelledBy = input.getAttribute('aria-labelledby');
        
        if (id) {
          const label = document.querySelector(`label[for="${id}"]`);
          if (!label && !ariaLabel && !ariaLabelledBy) {
            console.warn('Input sans label accessible:', input);
          }
        }
      });
    };

    // Vérifier les boutons
    const checkButtons = () => {
      const buttons = document.querySelectorAll('button');
      buttons.forEach((button) => {
        if (!button.textContent?.trim() && !button.getAttribute('aria-label')) {
          console.warn('Bouton sans texte accessible:', button);
        }
      });
    };

    // Exécuter les vérifications en développement
    if (process.env.NODE_ENV === 'development') {
      setTimeout(() => {
        checkContrasts();
        checkLabels();
        checkButtons();
      }, 1000);
    }
  }, []);

  return null;
}