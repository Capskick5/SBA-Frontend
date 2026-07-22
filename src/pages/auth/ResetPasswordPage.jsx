import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Mail,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { AuthFormMessage } from '../../components/auth/AuthFormFooter';
import { captureFormError } from '../../utils/formErrorUtils';
import { authService } from '../../services/authService';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const emailDefault = params.get('email') || '';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});
    const form = new FormData(event.currentTarget);
    try {
      await authService.resetPassword({
        email: form.get('email'),
        otp: form.get('otp'),
        newPassword: form.get('newPassword'),
      });
      navigate('/login?reset=1');
    } catch (err) {
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
                Đặt lại <span className="auth-hero-highlight">mật khẩu</span>
              </h2>
              <p className="auth-hero-subtitle">
                Tạo mật khẩu mới an toàn cho tài khoản BookVerse của bạn.
              </p>
            </div>

            <div className="auth-hero-features">
              <div className="auth-hero-feature-item">
                <ShieldCheck size={18} className="auth-hero-feature-icon" />
                <span>Bảo mật tài khoản tuyệt đối</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="auth-form-panel">
          <div className="auth-form-header">
            <h1 className="auth-title">Đặt lại mật khẩu</h1>
            <p className="auth-subtitle">Nhập email, mã OTP và mật khẩu mới của bạn</p>
          </div>

          <AuthFormMessage error={error} />

          <form className="auth-form" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className="auth-field-group">
              <label htmlFor="reset-email" className="auth-label">
                Email
              </label>
              <div className="auth-input-wrapper">
                <Mail size={18} className="auth-input-icon" />
                <input
                  id="reset-email"
                  name="email"
                  type="email"
                  defaultValue={emailDefault}
                  className={`auth-input${fieldErrors.email ? ' is-invalid' : ''}`}
                  placeholder="you@example.com"
                  required
                />
              </div>
              {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
            </div>

            {/* OTP Field */}
            <div className="auth-field-group">
              <label htmlFor="reset-otp" className="auth-label">
                Mã OTP
              </label>
              <div className="auth-input-wrapper">
                <KeyRound size={18} className="auth-input-icon" />
                <input
                  id="reset-otp"
                  name="otp"
                  type="text"
                  className={`auth-input${fieldErrors.otp ? ' is-invalid' : ''}`}
                  placeholder="Nhập 6 chữ số OTP"
                  required
                />
              </div>
              {fieldErrors.otp && <span className="field-error">{fieldErrors.otp}</span>}
            </div>

            {/* New Password Field */}
            <div className="auth-field-group">
              <label htmlFor="reset-password" className="auth-label">
                Mật khẩu mới
              </label>
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-input-icon" />
                <input
                  id="reset-password"
                  name="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  className={`auth-input has-toggle${fieldErrors.newPassword ? ' is-invalid' : ''}`}
                  placeholder="Tối thiểu 6 ký tự"
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
              {fieldErrors.newPassword && <span className="field-error">{fieldErrors.newPassword}</span>}
            </div>

            <button type="submit" className="btn auth-submit-btn" disabled={loading}>
              {loading ? (
                <span>Đang xử lý...</span>
              ) : (
                <>
                  <span>Xác nhận đặt lại</span>
                  <Check size={18} />
                </>
              )}
            </button>
          </form>

          <div className="auth-bottom-prompt">
            <Link to="/login" className="auth-register-link">
              Quay lại đăng nhập <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
