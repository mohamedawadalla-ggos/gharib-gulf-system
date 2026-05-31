// components/ToastProvider.tsx
'use client';

import { ReactNode } from 'react';

// ✅ Simple, always-working toast implementation - no context needed
export function ToastProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useToast() {
  // ✅ Always returns a working toast function - never throws
  return {
    toast: (message: string) => {
      // Fallback: just log to console (works in SSR and client)
      if (typeof window !== 'undefined') {
        console.log('🍞 Toast:', message);
      }
      // Optional: Add actual toast UI here later
    }
  };
}