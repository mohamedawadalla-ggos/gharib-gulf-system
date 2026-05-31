// components/ToastProvider.tsx
'use client';

import { createContext, useContext, ReactNode } from 'react';

interface ToastContextType {
  toast: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const toast = (message: string) => {
    console.log('🍞 Toast:', message);
  };
  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  // ✅ Return fallback instead of throwing - works during SSR/static generation
  if (!context) {
    return {
      toast: (message: string) => {
        console.log('🍞 Toast (fallback):', message);
      }
    };
  }
  return context;
}