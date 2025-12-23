import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth-context';

export default function RequireAuth() {
  const { token, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <p>Checking session…</p>;
  }

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return <Outlet />;
}
