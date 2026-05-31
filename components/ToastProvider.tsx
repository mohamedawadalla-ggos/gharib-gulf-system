// components/ToastProvider.tsx
// ✅ NO 'use client' - works in SSR and static generation
// ✅ NO context - never throws, always returns valid object

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export const useToast = () => ({
  toast: (message: string) => {
    // No-op during SSR, console.log in browser
    if (typeof window !== 'undefined') {
      console.log('🍞 Toast:', message);
    }
  }
});