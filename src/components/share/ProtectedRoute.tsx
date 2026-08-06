import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import type { UserModel } from '../../model/User';
import { useFetchClient } from '../../hook/useFetchClient';
import { AUTH_API_ENDPOINTS } from '../../constants/customer/authApiEndpoints';

interface ProtectedRouteProps {
  requiredRoles?: string[];
}

const extractRoleCode = (rawRole: unknown): string | null => {
  if (!rawRole) return null;
  if (typeof rawRole === 'string') return rawRole;
  if (typeof rawRole === 'object' && 'roleCode' in rawRole) {
    const roleCode = (rawRole as { roleCode?: unknown }).roleCode;
    return typeof roleCode === 'string' ? roleCode : null;
  }
  return null;
};

const LoadingScreen = () => (
  <div className="fixed inset-0 bg-slate-50/50 backdrop-blur-xs flex flex-col items-center justify-center z-50">
    <div className="relative w-16 h-16">
      <div className="absolute inset-0 rounded-full border-4 border-[#00285E]/10 border-t-[#00285E] animate-spin"></div>
      <div className="absolute inset-3 rounded-full bg-[#F9A11B]/80 animate-pulse"></div>
    </div>
    <span className="mt-4 text-xs font-bold text-[#00285E] tracking-widest uppercase animate-pulse">
      Đang xác thực...
    </span>
  </div>
);

export default function ProtectedRoute({ requiredRoles }: ProtectedRouteProps) {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const reduxUser = useSelector((state: RootState) => state.user.user as UserModel | null);
  const { fetchPrivate } = useFetchClient();

  const needsRoleCheck = !!requiredRoles && requiredRoles.length > 0;
  const reduxRole = extractRoleCode(reduxUser?.role);
  const [resolvedRole, setResolvedRole] = useState<string | null>(reduxRole);
  const [isCheckingRole, setIsCheckingRole] = useState(needsRoleCheck && !reduxRole);

  useEffect(() => {
    if (!token || !needsRoleCheck || reduxRole) {
      setIsCheckingRole(false);
      return;
    }

    let isMounted = true;
    const fetchRole = async () => {
      try {
        const response = await fetchPrivate(AUTH_API_ENDPOINTS.PROFILE);
        const role = extractRoleCode(response?.data?.role);
        if (isMounted) setResolvedRole(role);
      } catch (error) {
        console.error('Không xác thực được quyền truy cập:', error);
        if (isMounted) setResolvedRole(null);
      } finally {
        if (isMounted) setIsCheckingRole(false);
      }
    };
    void fetchRole();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, needsRoleCheck]);

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (needsRoleCheck) {
    if (isCheckingRole) {
      return <LoadingScreen />;
    }
    const role = (reduxRole || resolvedRole || '').toUpperCase();
    const isAllowed = requiredRoles!.some((r) => r.toUpperCase() === role);
    if (!isAllowed) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <Outlet />;
}
