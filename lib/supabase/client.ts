import { createBrowserClient } from '@supabase/ssr';

// This variable holds the single instance
let supabaseInstance: ReturnType<typeof createBrowserClient>;

export function createSupabaseBrowserClient() {
  // If it doesn't exist, create it. If it does, return the existing one.
  if (!supabaseInstance) {
    supabaseInstance = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return supabaseInstance;
}