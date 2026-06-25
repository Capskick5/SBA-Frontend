import { Navigate, useLocation } from 'react-router-dom';
import { authService } from '../services/authService';

export function ProtectedRoute({ children }) {
  const location = useLocation();
  const user = authService.getCurrentUser();
  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }
  return children;
}

export function AdminRoute({ children }) {
  const user = authService.getCurrentUser();
  if (!user) return <Navigate to="/login?redirect=/admin" replace />;
  if (user.role !== 'ADMIN') return <Navigate to="/" replace />;
  return children;
}
