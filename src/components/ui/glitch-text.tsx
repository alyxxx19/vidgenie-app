'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface GlitchTextProps {
  children: string;
  className?: string;
  speed?: number;
  intensity?: number;
}

export function GlitchText({ 
  children, 
  className = '', 
  speed = 3000,
  intensity = 0.1 
}: GlitchTextProps) {
  const [displayText, setDisplayText] = useState(children);
  const [isGlitching, setIsGlitching] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() < intensity) {
        setIsGlitching(true);
        
        // Create glitch effect
        const chars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        const glitchChars = children
          .split('')
          .map(char => Math.random() < 0.3 ? chars[Math.floor(Math.random() * chars.length)] : char)
          .join('');
        
        setDisplayText(glitchChars);
        
        setTimeout(() => {
          setDisplayText(children);
          setIsGlitching(false);
        }, 100);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [children, speed, intensity]);

  return (
    <span 
      className={cn(
        'transition-all duration-100',
        isGlitching && 'text-primary animate-pulse',
        className
      )}
    >
      {displayText}
    </span>
  );
}