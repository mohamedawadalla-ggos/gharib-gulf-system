// lib/supabase/queries.ts
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export async function getAssetsForUser(supabase: any, role: string, companyCode: string | null) {
  // Get current user
  const userResult = await supabase.auth.getUser();
  const user = userResult.data?.user;
  
  if (!user) {
    // ✅ FIXED: Proper object syntax with 'data' key
    return { data: [], error: { message: 'User not authenticated' } };
  }
  
  let query = supabase.from('assets_clean').select('*');
  
  // Apply company filter for client role
  if (role === 'client' && companyCode) {
    query = query.eq('company_id', companyCode);
  }
  
  // Also filter out assets with no company_id for clients (optional)
  if (role === 'client') {
    query = query.or(`company_id.eq.${companyCode},company_id.is.null`);
  }
  
  return await query;
}

export async function getWorkOrdersForUser(supabase: any, role: string, companyCode: string | null) {
  // Get current user
  const userResult = await supabase.auth.getUser();
  const user = userResult.data?.user;
  
  if (!user) {
    // ✅ FIXED: Proper object syntax
    return { data: [], error: { message: 'User not authenticated' } };
  }
  
  let query = supabase.from('work_orders').select('*');
  
  // Apply company filter for client role
  if (role === 'client' && companyCode) {
    query = query.eq('company_id', companyCode);
  }
  
  return await query;
}

export async function getCurrentUserRole(supabase: any) {
  // Get current user
  const userResult = await supabase.auth.getUser();
  const user = userResult.data?.user;
  
  if (!user) {
    return { role: null, companyCode: null };
  }
  
  // Get role from database - NO destructuring, explicit access
  const roleQueryResult = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();
  
  // Access via .data.role
  const dbRole = roleQueryResult.data?.role;
  
  const userRole = dbRole || user.user_metadata?.role || 'crew';
  const userCompany = user.user_metadata?.company_code;
  
  return { role: userRole, companyCode: userCompany };
}