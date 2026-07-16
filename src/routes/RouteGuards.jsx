import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingState } from '../components/ui/State';

export function ProtectedRoute({ children }) {
  const location = useLocation();
  const { user, loading } = useAuth();
  if (loading) return <LoadingState />;
  if (!user) {
    const redirect = `${location.pathname}${location.search || ''}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }
  if (user.role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }
  return children;
}

export function StorefrontRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingState />;
  if (user?.role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }

  return children;
}

export function CustomerRoute({ children }) {
  const location = useLocation();
  const { user, loading } = useAuth();

  if (loading) return <LoadingState />;
  if (!user) {
    const redirect = `${location.pathname}${location.search || ''}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  if (user.role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }

  return children;
}

/** Allows guests and customers; admins are sent to /admin. */
export function GuestOrCustomerRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingState />;
  if (user?.role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }

  return children;
}

export function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingState />;
  if (!user) return <Navigate to="/admin/login" replace />;

  if (user.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return children;
}
