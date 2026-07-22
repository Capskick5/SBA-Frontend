import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Mail,
  KeyRound,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  TicketPercent,
  ShieldCheck,
  RotateCcw,
  Check,
} from 'lucide-react';
import { AuthFormMessage } from '../../components/auth/AuthFormFooter';
import { captureFormError } from '../../utils/formErrorUtils';
import { authService } from '../../services/authService';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const emailDefault = params.get('email') || '';

  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    setFieldErrors({});
    const form = new FormData(event.currentTarget);
    try {
      await authService.verifyEmail({
        email: form.get('email'),
        otp: form.get('otp'),
      });
      setSuccess('Xác minh email thành công. Bạn có thể đăng nhập ngay.');
    } catch (err) {
      captureFormError(err, setError, setFieldErrors);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    const emailInput = document.querySelector('[name="email"]');
    const email = emailInput?.value || emailDefault;
    if (!email) {
      setError({ message: 'Vui lòng nhập email để gửi lại mã OTP.' });
      return;
    }
    setResendLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await authService.resendVerification({ email });
      setSuccess('Mã OTP mới đã được gửi nếu email tồn tại.');
    } catch (err) {
      captureFormError(err, setError, setFieldErrors);
    } finally {
      setResendLoading(false);
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
                Xác minh <span className="auth-hero-highlight">tài khoản</span>
              </h2>
              <p className="auth-hero-subtitle">
                Mã OTP đã được gửi đến email của bạn. Vui lòng nhập mã để hoàn tất đăng ký tài khoản.
              </p>
            </div>

            <div className="auth-hero-features">
              <div className="auth-hero-feature-item">
                <ShieldCheck size={18} className="auth-hero-feature-icon" />
                <span>Bảo mật tài khoản tuyệt đối</span>
              </div>
              <div className="auth-hero-feature-item">
                <TicketPercent size={18} className="auth-hero-feature-icon" />
                <span>Tự động nhận quà tặng cho thành viên mới</span>
              </div>
              <div className="auth-hero-feature-item">
                <CheckCircle2 size={18} className="auth-hero-feature-icon" />
                <span>Trải nghiệm mua sách tiện lợi & an toàn</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="auth-form-panel">
          <div className="auth-form-header">
            <h1 className="auth-title">Xác minh email</h1>
            <p className="auth-subtitle">
              Nhập mã OTP 6 chữ số đã được gửi tới hộp thư của bạn
            </p>
          </div>

          <AuthFormMessage error={error} success={success} />

          <form className="auth-form" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className="auth-field-group">
              <label htmlFor="verify-email" className="auth-label">
                Email nhận OTP
              </label>
              <div className="auth-input-wrapper">
                <Mail size={18} className="auth-input-icon" />
                <input
                  id="verify-email"
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
              <label htmlFor="verify-otp" className="auth-label">
                Mã OTP
              </label>
              <div className="auth-input-wrapper">
                <KeyRound size={18} className="auth-input-icon" />
                <input
                  id="verify-otp"
                  name="otp"
                  type="text"
                  className={`auth-input${fieldErrors.otp ? ' is-invalid' : ''}`}
                  placeholder="Nhập 6 chữ số OTP..."
                  required
                />
              </div>
              {fieldErrors.otp && <span className="field-error">{fieldErrors.otp}</span>}
            </div>

            {/* Action Buttons */}
            <div className="auth-btn-row">
              <button
                type="button"
                className="btn auth-secondary-btn"
                onClick={handleResend}
                disabled={resendLoading}
              >
                <RotateCcw size={16} />
                <span>{resendLoading ? 'Đang gửi...' : 'Gửi lại OTP'}</span>
              </button>

              <button type="submit" className="btn auth-submit-btn" disabled={loading}>
                {loading ? (
                  <span>Đang xử lý...</span>
                ) : (
                  <>
                    <span>Xác minh</span>
                    <Check size={18} />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Bottom Link Prompt */}
          <div className="auth-bottom-prompt">
            {success ? (
              <Link to="/login?registered=1" className="auth-register-link">
                Đi đến trang đăng nhập <ArrowRight size={14} />
              </Link>
            ) : (
              <>
                <span>Đã có tài khoản?</span>
                <Link to="/login" className="auth-register-link">
                  Quay lại đăng nhập <ArrowRight size={14} />
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
