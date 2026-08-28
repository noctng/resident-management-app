import { useMemo } from 'react';
import type { User, Permission } from '../types';

export function usePermission(user: User | null) {
  const hasPermission = useMemo(() => {
    return (perm: Permission): boolean => {
      if (!user) return false;
      if (user.role === 0) return true; // Admin has all permissions
      return user.permissions?.includes(perm) || false;
    };
  }, [user]);

  const isAdmin = user?.role === 0;
  const isManager = user?.role === 1;

  return {
    hasPermission,
    isAdmin,
    isManager,
  };
}

export default usePermission;
