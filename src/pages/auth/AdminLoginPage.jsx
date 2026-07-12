import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { AuthFormMessage } from '../../components/auth/AuthFormFooter';
import { useAuth } from '../../context/AuthContext';
import { captureFormError } from '../../utils/formErrorUtils';
import { authService } from '../../services/authService';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  if (user?.role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    const form = new FormData(event.currentTarget);

    try {
      const loggedIn = await authService.login({
        email: form.get('email'),
        password: form.get('password'),
      });

      if (loggedIn.role !== 'ADMIN') {
        await authService.logout();
        setError({ message: 'This portal is for administrators only. Please use the customer login page.' });
        return;
      }

      await refreshUser();
      navigate('/admin', { replace: true });
    } catch (err) {
      captureFormError(err, setError, setFieldErrors);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <div className="admin-login-heading">
          <span>BookVerse Admin</span>
          <h1>Admin Portal</h1>
        </div>

        <AuthFormMessage error={error} />

        <form className="form" onSubmit={handleSubmit}>
          <Input
            label="Admin email"
            name="email"
            type="email"
            placeholder="admin@bookverse.local"
            error={fieldErrors.email}
            required
          />
          <Input
            label="Password"
            name="password"
            type="password"
            placeholder="Enter admin password"
            error={fieldErrors.password}
            required
          />
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in to admin'}
          </Button>
        </form>
      </section>
    </main>
  );
}
