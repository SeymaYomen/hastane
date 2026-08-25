import { Navigate, useLocation } from 'react-router-dom';
import { useAuthRole } from '../hooks/useAuthRole';

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const location = useLocation();

  const { loading, isAuthenticated } = useAuthRole();

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-gray-500">Oturum kontrol ediliyor...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default PrivateRoute;
