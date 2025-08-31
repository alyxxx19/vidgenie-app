'use client';

import { toast as sonnerToast } from 'sonner';

interface ToastProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function toast({ title, description, variant = 'default' }: ToastProps) {
  if (variant === 'destructive') {
    sonnerToast.error(title, { description });
  } else {
    sonnerToast.success(title, { description });
  }
}

export { toast as useToast };