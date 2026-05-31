// app/layout.tsx
'use client';

import './globals.css';
import { Inter } from 'next/font/google';
import { createContext, useContext, ReactNode } from 'react';

const inter = Inter({ subsets: ['latin'] });

// === Inline Toast Context ===
interface ToastContextType {
  toast: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

function ToastProvider({ children }: { children: ReactNode }) {
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
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
// === End Inline Toast Context ===

export const metadata = {
  title: 'Gharib Gulf System',
  description: 'Wellhead & Valves Maintenance Management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}