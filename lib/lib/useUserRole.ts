// lib/useUserRole.ts
export function useUserRole() {
  const [role, setRole] = useState<string | null>(null);
  const [companyCode, setCompanyCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    async function fetchUserRole() {
      const {  { user } } = await supabase.auth.getUser();
      if (!user) { setRole(null); setLoading(false); return; }

      // Check database role first
      const {  roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      const userRole = roleData?.role || user.user_metadata?.role || 'client';
      const userCompany = user.user_metadata?.company_code;

      setRole(userRole);
      setCompanyCode(userCompany);
      setLoading(false);
    }
    fetchUserRole();
  }, []);

  return { 
    role, 
    companyCode,
    loading, 
    isAdmin: role === 'admin',
    isTopManagement: ['top_management', 'admin'].includes(role || ''),
    isFieldManager: ['field_manager', 'supervisor', 'top_management', 'admin'].includes(role || ''),
    isSupervisor: ['supervisor', 'field_manager', 'top_management', 'admin'].includes(role || ''),
    isCrew: role === 'crew',
    isClient: role === 'client',  // NEW: Client role check
    isReadOnly: role === 'client',  // NEW: Read-only flag
    canEdit: !['client'].includes(role || ''),  // NEW: Edit permission
    canDelete: ['admin'].includes(role || ''),  // NEW: Delete permission
  };
}