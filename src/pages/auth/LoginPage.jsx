import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  BookOpen,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Truck,
  TicketPercent,
} from 'lucide-react';
import { AuthFormMessage } from '../../components/auth/AuthFormFooter';
import { captureFormError } from '../../utils/formErrorUtils';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { cartFacade } from '../../services/cartFacade';
import { notifyCartUpdated } from '../../utils/cartEvents';
import { showToast } from '../../utils/toast';
import {
  checkServerOrderHistoryAndLock,
  getLockedTimeRemainingMessage,
  getLockExpiration,
} from '../../utils/userLockGuard';

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
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="auth-page-container">
      <div className="auth-split-card">
        {/* Left Hero Panel */}
        <div className="auth-hero-panel">
          <div className="auth-hero-content">
            <div className="auth-hero-brand">
              <BookOpen size={28} className="auth-hero-logo-icon" />
              <span className="auth-hero-brand-name">BookVerse</span>
            </div>

            <div className="auth-hero-main">
              <h2 className="auth-hero-title">
                Khám phá thế giới tri thức <span className="auth-hero-highlight">bất tận</span>
              </h2>
              <p className="auth-hero-subtitle">
                Đăng nhập để trải nghiệm mua sắm sách tiện lợi và nhận nhiều ưu đãi hấp dẫn.
              </p>
            </div>

            <div className="auth-hero-features">
              <div className="auth-hero-feature-item">
                <CheckCircle2 size={18} className="auth-hero-feature-icon" />
                <span>100% Sách chất lượng & chính hãng</span>
              </div>
              <div className="auth-hero-feature-item">
                <TicketPercent size={18} className="auth-hero-feature-icon" />
                <span>Ưu đãi voucher & tích điểm thành viên</span>
              </div>
              <div className="auth-hero-feature-item">
                <Truck size={18} className="auth-hero-feature-icon" />
                <span>Giao hàng nhanh chóng toàn quốc</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="auth-form-panel">
          <div className="auth-form-header">
            <h1 className="auth-title">Chào mừng trở lại!</h1>
            <p className="auth-subtitle">Vui lòng nhập thông tin đăng nhập để tiếp tục</p>
          </div>

          {registered && (
            <p className="form-message form-message-success">
              Đăng ký thành công. Vui lòng xác minh email trước khi đăng nhập.
            </p>
          )}
          {reset && (
            <p className="form-message form-message-success">
              Đặt lại mật khẩu thành công. Vui lòng đăng nhập.
            </p>
          )}
          {location.state?.message && (
            <p className="form-message form-message-success">{location.state.message}</p>
          )}

          <AuthFormMessage error={error} />

          {unverifiedEmail && (
            <p className="auth-footer" style={{ marginBottom: '16px' }}>
              <Link to={`/verify-email?email=${encodeURIComponent(unverifiedEmail)}`}>
                👉 Bấm vào đây để xác minh email
              </Link>
            </p>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className="auth-field-group">
              <label htmlFor="login-email" className="auth-label">
                Email
              </label>
              <div className="auth-input-wrapper">
                <Mail size={18} className="auth-input-icon" />
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  className={`auth-input${fieldErrors.email ? ' is-invalid' : ''}`}
                  placeholder="you@example.com"
                  required
                />
              </div>
              {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
            </div>

            {/* Password Field */}
            <div className="auth-field-group">
              <div className="auth-label-row">
                <label htmlFor="login-password" className="auth-label">
                  Mật khẩu
                </label>
                <Link to="/forgot-password" className="auth-forgot-link">
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-input-icon" />
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className={`auth-input has-toggle${fieldErrors.password ? ' is-invalid' : ''}`}
                  placeholder="Nhập mật khẩu của bạn"
                  required
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
            </div>

            {/* Remember me row */}
            <div className="auth-options-row">
              <label className="auth-checkbox-label">
                <input type="checkbox" name="remember" className="auth-checkbox" defaultChecked />
                <span>Ghi nhớ đăng nhập</span>
              </label>
            </div>

            {/* Submit Button */}
            <button type="submit" className="btn auth-submit-btn" disabled={loading}>
              {loading ? (
                <span>Đang xử lý...</span>
              ) : (
                <>
                  <span>Đăng nhập</span>
                  <LogIn size={18} />
                </>
              )}
            </button>
          </form>

          {/* Register Prompt */}
          <div className="auth-bottom-prompt">
            <span>Chưa có tài khoản?</span>
            <Link to="/register" className="auth-register-link">
              Đăng ký ngay <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
