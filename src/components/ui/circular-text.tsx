'use client';

import { useEffect, useRef } from 'react';

interface CircularTextProps {
  text: string;
  radius?: number;
  fontSize?: number;
  className?: string;
  duration?: number;
}

const CircularText = ({ 
  text, 
  radius = 50, 
  fontSize = 14,
  className = '',
  duration = 10
}: CircularTextProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !innerRef.current) return;

    const inner = innerRef.current;
    const characters = text.split('');
    const angleStep = 360 / characters.length;

    // Clear existing content
    inner.innerHTML = '';

    // Create circular text with counter-rotation for each character
    characters.forEach((char, index) => {
      const charWrapper = document.createElement('div');
      charWrapper.style.position = 'absolute';
      charWrapper.style.left = '50%';
      charWrapper.style.top = '50%';
      charWrapper.style.transform = `
        translate(-50%, -50%) 
        rotate(${angleStep * index}deg) 
        translateY(-${radius}px)
      `;
      
      const span = document.createElement('span');
      span.textContent = char;
      span.style.display = 'inline-block';
      span.style.fontSize = `${fontSize}px`;
      span.style.letterSpacing = '0.1em';
      span.className = 'select-none circular-text-char';
      
      // Counter-rotate each character to keep it upright
      span.style.animation = `counter-rotate ${duration}s linear infinite`;
      
      charWrapper.appendChild(span);
      inner.appendChild(charWrapper);
    });

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (!prefersReducedMotion) {
      // Add rotation animation to inner container
      inner.style.animation = `circular-spin ${duration}s linear infinite`;
    }
  }, [text, radius, fontSize, duration]);

  return (
    <div 
      ref={containerRef}
      className={`circular-text relative ${className}`}
      style={{ 
        width: radius * 2, 
        height: radius * 2,
        position: 'relative'
      }}
      aria-label={text}
    >
      <div 
        ref={innerRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative'
        }}
      />
    </div>
  );
};

export default CircularText;