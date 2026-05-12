// lib/supabase/queries.ts
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export async function getAssetsForUser(supabase: any, role: string, companyCode: string | null) {
  // ✅ FIXED: Simple explicit access instead of nested destructuring
  const result = await supabase.auth.getUser();
  const user = result.data?.user;
  
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
  // ✅ FIXED: Simple explicit access
  const result = await supabase.auth.getUser();
  const user = result.data?.user;
  
  let query = supabase.from('work_orders').select('*');
  
  // Apply company filter for client role
  if (role === 'client' && companyCode) {
    query = query.eq('company_id', companyCode);
  }
  
  return await query;
}

export async function getCurrentUserRole(supabase: any) {
  // ✅ FIXED: Simple explicit access - no nested destructuring
  const result = await supabase.auth.getUser();
  const user = result.data?.user;
  
  if (!user) return { role: null, companyCode: null };
  
  // Check database role first (more secure than metadata)
  const {  roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();
  
  const userRole = roleData?.role || user.user_metadata?.role || 'crew';
  const userCompany = user.user_metadata?.company_code;
  
  return { role: userRole, companyCode: userCompany };
}