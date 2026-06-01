// lib/useUserRole.ts
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useUserRole() {
  const [role, setRole] = useState<string | null>(null);
  const [companyCode, setCompanyCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchUserRole() {
      try {
        // ✅ Get user - simple explicit access
        const userResult = await supabase.auth.getUser();
        const user = userResult.data?.user;
        
        if (!user) {
          setRole(null);
          setCompanyCode(null);
          setLoading(false);
          return;
        }

        // ✅ Get role from database - simple explicit access
        const roleResult = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        // Access via .data.role instead of destructuring
        const dbRole = roleResult.data?.role;
        
        const userRole = dbRole || user.user_metadata?.role || 'crew';
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