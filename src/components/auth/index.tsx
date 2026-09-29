// ==========================================
// BhoomiAI - Auth Guard Components
// ==========================================

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { UserRole, Permission, GOVERNMENT_ROLES } from '../../types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, redirectTo = '/login' }) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }
  return <>{children}</>;
};

interface RoleGuardProps {
  children: React.ReactNode;
  roles: UserRole[];
  fallback?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ children, roles, fallback }) => {
  const { user } = useAuthStore();
  if (!user || !roles.includes(user.role)) {
    return fallback ? <>{fallback}</> : (
      <div className="flex flex-col items-center justify-center py-20 text-text-tertiary">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-6V7a4 4 0 10-8 0v4m12 0H4" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-text-primary">Access Denied</h3>
        <p className="text-sm mt-1">You do not have permission to view this page.</p>
      </div>
    );
  }
  return <>{children}</>;
};

interface PermissionGuardProps {
  children: React.ReactNode;
  permissions: Permission[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({ children, permissions, requireAll = false, fallback }) => {
  const { hasPermission, hasAnyPermission } = useAuthStore();
  const hasAccess = requireAll
    ? permissions.every(p => hasPermission(p))
    : hasAnyPermission(permissions);

  if (!hasAccess) return fallback ? <>{fallback}</> : null;
  return <>{children}</>;
};

// Government-only route wrapper
export const GovernmentRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();
  if (!user || !GOVERNMENT_ROLES.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// Citizen-only route wrapper
export const CitizenRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuthStore();
  // Citizens can browse without login for some pages
  if (isAuthenticated && user && GOVERNMENT_ROLES.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};
