import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingState } from '../components/ui/State';

export function ProtectedRoute({ children }) {
  const location = useLocation();
  const { user, loading } = useAuth();
  if (loading) return <LoadingState />;
  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }
  return children;
}

export function CustomerRoute({ children }) {
  const location = useLocation();
  const { user, loading } = useAuth();

  if (loading) return <LoadingState />;
  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (user.role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }

  return children;
}

export function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingState />;
  if (!user) return <Navigate to="/login?redirect=/admin" replace />;

  if (user.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return children;
}


