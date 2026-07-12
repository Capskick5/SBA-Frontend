import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { AuthFormFooter, AuthFormMessage } from '../../components/auth/AuthFormFooter';
import { captureFormError } from '../../utils/formErrorUtils';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshUser } = useAuth();
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
      const loggedIn = await authService.login({
        email,
        password: form.get('password'),
      });
      if (loggedIn.role === 'ADMIN') {
        await authService.logout();
        setError({ message: 'Invalid email or password.' });
        return;
      }

      await refreshUser();
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
        <p className="form-message form-message-success">Registration completed. Please verify your email before logging in.</p>
      )}
      {reset && (
        <p className="form-message form-message-success">Password reset completed. Please log in.</p>
      )}
      {location.state?.message && (
        <p className="form-message form-message-success">{location.state.message}</p>
      )}
      <AuthFormMessage error={error} />
      {unverifiedEmail && (
        <p className="auth-footer">
          <Link to={`/verify-email?email=${encodeURIComponent(unverifiedEmail)}`}>Verify email</Link>
        </p>
      )}
      <form className="form" onSubmit={handleSubmit}>
        <Input
          label="Email"
          name="email"
          type="email"
          placeholder="you@example.com"
          error={fieldErrors.email}
          required
        />
        <Input
          label="Password"
          name="password"
          type="password"
          placeholder="Enter your password"
          error={fieldErrors.password}
          required
        />
        <Button type="submit" disabled={loading}>{loading ? 'Processing...' : 'Login'}</Button>
      </form>
      <AuthFormFooter>
        <Link to="/register">Need an account? Register</Link>
        {' · '}
        <Link to="/forgot-password">Forgot password?</Link>
      </AuthFormFooter>
    </section>
  );
}
