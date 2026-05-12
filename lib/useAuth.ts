// lib/useAuth.ts
'use client';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' });
      localStorage.removeItem('gharib-gulf-session');
      sessionStorage.clear();
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = '/login';
    }
  };

  return { handleLogout };
}