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
        setError({ message: 'Cổng này chỉ dành cho quản trị viên. Vui lòng sử dụng trang đăng nhập khách hàng.' });
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
          <h1>Cổng quản trị</h1>
        </div>

        <AuthFormMessage error={error} />

        <form className="form" onSubmit={handleSubmit}>
          <Input
            label="Email quản trị viên"
            name="email"
            type="email"
            placeholder="admin@bookverse.local"
            error={fieldErrors.email}
            required
          />
          <Input
            label="Mật khẩu"
            name="password"
            type="password"
            placeholder="Nhập mật khẩu quản trị"
            error={fieldErrors.password}
            required
          />
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập quản trị'}
          </Button>
        </form>
      </section>
    </main>
  );
}
