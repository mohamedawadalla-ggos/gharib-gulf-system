// lib/supabase/queries.ts
export async function getAssetsForUser(userId: string, supabase: any) {
  // Get user's role and company
  const {  roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();
  
  const {  { user } } = await supabase.auth.getUser();
  const companyCode = user?.user_metadata?.company_code;
  const role = roleData?.role || user?.user_metadata?.role;
  
  // Build query with company filter for clients
  let query = supabase.from('assets_clean').select('*');
  
  if (role === 'client' && companyCode) {
    query = query.eq('company_id', companyCode);
  }
  
  return await query;
}