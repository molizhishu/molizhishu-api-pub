import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { hasAuthToken } from '../api';

export function RequireAuth() {
  const location = useLocation();

  if (!hasAuthToken()) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return <Outlet />;
}
