import { Navigate } from 'react-router-dom';
import { useAuthRole } from '../hooks/useAuthRole';
import { getRoleHomePath, type UserRole } from '../services/auth/roleService';

type RoleRouteProps = {
  children: JSX.Element;
  allowedRoles: UserRole[];
};

const RoleRoute = ({ children, allowedRoles }: RoleRouteProps) => {
  const { isAuthenticated, role, loading } = useAuthRole();

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-gray-500">Yetki kontrol ediliyor...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!role) {
    return <Navigate to="/" replace />;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to={getRoleHomePath(role)} replace />;
  }

  // This route guard is UX protection; Supabase RLS and RPC checks remain authoritative.
  return children;
};

export default RoleRoute;
