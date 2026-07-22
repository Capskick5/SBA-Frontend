import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  Send,
} from 'lucide-react';
import { AuthFormMessage } from '../../components/auth/AuthFormFooter';
import { captureFormError } from '../../utils/formErrorUtils';
import { authService } from '../../services/authService';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});
    const form = new FormData(event.currentTarget);
    const email = form.get('email');
    try {
      await authService.forgotPassword({ email });
      navigate(`/reset-password?email=${encodeURIComponent(email)}`);
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
                Khôi phục <span className="auth-hero-highlight">mật khẩu</span>
              </h2>
              <p className="auth-hero-subtitle">
                Đừng lo lắng! Chúng tôi sẽ gửi mã OTP đến email của bạn để giúp bạn thiết lập lại mật khẩu an toàn.
              </p>
            </div>

            <div className="auth-hero-features">
              <div className="auth-hero-feature-item">
                <ShieldCheck size={18} className="auth-hero-feature-icon" />
                <span>Quy trình bảo mật 2 lớp an toàn</span>
              </div>
              <div className="auth-hero-feature-item">
                <KeyRound size={18} className="auth-hero-feature-icon" />
                <span>Mã xác thực OTP có hiệu lực tức thì</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="auth-form-panel">
          <div className="auth-form-header">
            <h1 className="auth-title">Quên mật khẩu?</h1>
            <p className="auth-subtitle">Nhập email đăng ký tài khoản của bạn để nhận mã OTP</p>
          </div>

          <AuthFormMessage error={error} />

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field-group">
              <label htmlFor="forgot-email" className="auth-label">
                Email tài khoản
              </label>
              <div className="auth-input-wrapper">
                <Mail size={18} className="auth-input-icon" />
                <input
                  id="forgot-email"
                  name="email"
                  type="email"
                  className={`auth-input${fieldErrors.email ? ' is-invalid' : ''}`}
                  placeholder="you@example.com"
                  required
                />
              </div>
              {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
            </div>

            <button type="submit" className="btn auth-submit-btn" disabled={loading}>
              {loading ? (
                <span>Đang xử lý...</span>
              ) : (
                <>
                  <span>Gửi mã OTP</span>
                  <Send size={18} />
                </>
              )}
            </button>
          </form>

          <div className="auth-bottom-prompt">
            <span>Nhớ ra mật khẩu?</span>
            <Link to="/login" className="auth-register-link">
              Quay lại đăng nhập <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
