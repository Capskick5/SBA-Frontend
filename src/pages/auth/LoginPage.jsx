import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { AuthFormFooter, AuthFormMessage } from '../../components/auth/AuthFormFooter';
import { captureFormError } from '../../utils/formErrorUtils';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [params] = useSearchParams();
  const redirect = params.get('redirect') || '/';
  const registered = params.get('registered');
  const reset = params.get('reset');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [unverifiedEmail, setUnverifiedEmail] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});
    setUnverifiedEmail(null);
    const form = new FormData(event.currentTarget);
    const email = form.get('email');
    try {
      await login({
        email,
        password: form.get('password'),
      });
      navigate(redirect);
    } catch (err) {
      if (err.error_type === 'EMAIL_NOT_VERIFIED') {
        setUnverifiedEmail(email);
      }
      captureFormError(err, setError, setFieldErrors);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="narrow">
      <h1>Login</h1>
      {registered && (
        <p className="form-message form-message-success">Dang ky thanh cong. Vui long xac thuc email truoc khi dang nhap.</p>
      )}
      {reset && (
        <p className="form-message form-message-success">Dat lai mat khau thanh cong. Vui long dang nhap.</p>
      )}
      {location.state?.message && (
        <p className="form-message form-message-success">{location.state.message}</p>
      )}
      <AuthFormMessage error={error} />
      {unverifiedEmail && (
        <p className="auth-footer">
          <Link to={`/verify-email?email=${encodeURIComponent(unverifiedEmail)}`}>Xac thuc email</Link>
        </p>
      )}
      <form className="form" onSubmit={handleSubmit}>
        <Input
          label="Email"
          name="email"
          type="email"
          defaultValue="admin@bookverse.local"
          error={fieldErrors.email}
          required
        />
        <Input
          label="Password"
          name="password"
          type="password"
          defaultValue="ChangeMe123!"
          error={fieldErrors.password}
          required
        />
        <Button type="submit" disabled={loading}>{loading ? 'Dang xu ly...' : 'Login'}</Button>
      </form>
      <AuthFormFooter>
        <Link to="/register">Chua co tai khoan? Dang ky</Link>
        {' · '}
        <Link to="/forgot-password">Quen mat khau?</Link>
      </AuthFormFooter>
    </section>
  );
}
