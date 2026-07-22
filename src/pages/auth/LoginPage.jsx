import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { AuthFormFooter, AuthFormMessage } from '../../components/auth/AuthFormFooter';
import { captureFormError } from '../../utils/formErrorUtils';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { cartFacade } from '../../services/cartFacade';
import { notifyCartUpdated } from '../../utils/cartEvents';
import { showToast } from '../../utils/toast';
import { checkServerOrderHistoryAndLock, getLockedTimeRemainingMessage, getLockExpiration } from '../../utils/userLockGuard';

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

  useEffect(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('locked_until_')) {
        const userId = key.replace('locked_until_', '');
        const expiration = getLockExpiration(userId);
        if (expiration) {
          setError({ message: getLockedTimeRemainingMessage(userId) });
          break;
        }
      }
    }
  }, []);

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
        setError({ message: 'Email hoặc mật khẩu không hợp lệ.' });
        return;
      }

      await refreshUser();
      try {
        const lockExpiresAt = await checkServerOrderHistoryAndLock(loggedIn.id);
        if (lockExpiresAt) {
          const lockMsg = getLockedTimeRemainingMessage(loggedIn.id);
          await authService.logout();
          setError({ message: lockMsg });
          return;
        }
      } catch (lockErr) {
        console.error('Failed to check user lock:', lockErr);
      }

      try {
        const mergedCart = await cartFacade.mergeGuestCartAfterLogin();
        if (mergedCart) {
          notifyCartUpdated(mergedCart);
          showToast('Giỏ hàng khách đã được chuyển vào tài khoản của bạn.');
        }
      } catch {
        showToast(
          'Đã đăng nhập, nhưng không thể gộp giỏ hàng khách. Các sản phẩm vẫn được giữ lại cho bạn.',
          'error',
        );
      }
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
      <h1>Đăng nhập</h1>
      {registered && (
        <p className="form-message form-message-success">Đăng ký thành công. Vui lòng xác minh email trước khi đăng nhập.</p>
      )}
      {reset && (
        <p className="form-message form-message-success">Đặt lại mật khẩu thành công. Vui lòng đăng nhập.</p>
      )}
      {location.state?.message && (
        <p className="form-message form-message-success">{location.state.message}</p>
      )}
      <AuthFormMessage error={error} />
      {unverifiedEmail && (
        <p className="auth-footer">
          <Link to={`/verify-email?email=${encodeURIComponent(unverifiedEmail)}`}>Xác minh email</Link>
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
          label="Mật khẩu"
          name="password"
          type="password"
          placeholder="Nhập mật khẩu của bạn"
          error={fieldErrors.password}
          required
        />
        <Button type="submit" disabled={loading}>{loading ? 'Đang xử lý...' : 'Đăng nhập'}</Button>
      </form>
      <AuthFormFooter>
        <Link to="/register">Chưa có tài khoản? Đăng ký</Link>
        {' · '}
        <Link to="/forgot-password">Quên mật khẩu?</Link>
      </AuthFormFooter>
    </section>
  );
}
