import { useMemo } from 'react';
import type { User, Permission, PermAction, EffectivePermission } from '../types';

export function usePermission(user: User | null) {
  const hasPermission = useMemo(() => {
    return (perm: Permission): boolean => {
      if (!user) return false;
      if (user.role === 0) return true; // Admin has all permissions
      return user.permissions?.includes(perm) || false;
    };
  }, [user]);

  // RBAC: kiểm tra module + action (CRUDA). Nếu không truyền action -> fallback module-level (cũ)
  const hasPerm = useMemo(() => {
    return (module: Permission, action?: PermAction): boolean => {
      if (!user) return false;
      // Full-access: admin (role 0) hoặc manager (role 1)
      if (user.role === 0 || user.role === 1) return true;
      // Nếu user có role ADMIN/MANAGER trong roles[] -> full
      if (user.roles?.some((r) => r.code === 'ADMIN' || r.code === 'MANAGER')) return true;
      if (!action) {
        // fallback module-level (compat cũ)
        return user.permissions?.includes(module) || false;
      }
      const perms: EffectivePermission[] = user.perms || [];
      return perms.some((p) => p.module === module && p.action === action);
    };
  }, [user]);

  const isAdmin = user?.role === 0;
  const isManager = user?.role === 1;

  return {
    hasPermission,
    hasPerm,
    isAdmin,
    isManager,
  };
}

export default usePermission;
