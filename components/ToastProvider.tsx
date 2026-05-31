// components/ToastProvider.tsx
'use client';

import { ReactNode } from 'react';

// ✅ Ultra-simple: No context, no throwing, always works
export function ToastProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useToast() {
  // ✅ Always returns a valid object - NEVER throws
  return {
    toast: (message: string) => {
      console.log('🍞 Toast:', message);
    }
  };
}