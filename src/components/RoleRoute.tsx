import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  getCurrentUserRole,
  type UserRole,
} from '../services/auth/roleService';

type RoleRouteProps = {
  children: JSX.Element;
  allowedRoles: UserRole[];
};

const RoleRoute = ({ children, allowedRoles }: RoleRouteProps) => {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkAccess = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (!session?.user) {
          setHasSession(false);
          setLoading(false);
          return;
        }

        setHasSession(true);

        const currentRole = await getCurrentUserRole(session.user.id);

        if (mounted) {
          setRole(currentRole);
        }
      } catch (error) {
        console.error('Rol kontrolü başarısız:', error);

        if (mounted) {
          setRole(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    checkAccess();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-gray-500">
          Yetki kontrol ediliyor...
        </p>
      </div>
    );
  }

  if (!hasSession) {
    return <Navigate to="/login" replace />;
  }

  if (!role) {
    return <Navigate to="/" replace />;
  }

  if (!allowedRoles.includes(role)) {
    if (role === 'doctor') {
      return <Navigate to="/doctor" replace />;
    }

    if (role === 'admin') {
      return <Navigate to="/admin" replace />;
    }

    return <Navigate to="/appointment" replace />;
  }

  return children;
};

export default RoleRoute;
