// lib/useUserRole.ts
'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export function useUserRole() {
  const [role, setRole] = useState<string | null>(null);
  const [companyCode, setCompanyCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    async function fetchUserRole() {
      try {
        // ✅ SIMPLE: Get result, then access user explicitly
        const result = await supabase.auth.getUser();
        const user = result.data?.user;
        
        if (!user) {
          setRole(null);
          setCompanyCode(null);
          setLoading(false);
          return;
        }

        // Check database role first (more secure than metadata)
        const {  roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        const userRole = roleData?.role || user.user_metadata?.role || 'crew';
        const userCompany = user.user_metadata?.company_code;

        setRole(userRole);
        setCompanyCode(userCompany);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user role:', error);
        setRole(null);
        setCompanyCode(null);
        setLoading(false);
      }
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
    isClient: role === 'client',
    isReadOnly: role === 'client',
    canEdit: !['client'].includes(role || ''),
    canDelete: ['admin'].includes(role || ''),
  };
}