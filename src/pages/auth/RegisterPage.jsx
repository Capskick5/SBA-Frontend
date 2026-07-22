import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  BookOpen,
  CheckCircle2,
  ArrowRight,
  TicketPercent,
} from 'lucide-react';
import { AuthFormMessage } from '../../components/auth/AuthFormFooter';
import { captureFormError } from '../../utils/formErrorUtils';
import { authService } from '../../services/authService';

export default function RegisterPage() {
  const navigate = useNavigate();
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
      await authService.register({
        fullName: form.get('fullName'),
        email: form.get('email'),
        password: form.get('password'),
      });
      const email = encodeURIComponent(form.get('email'));
      navigate(`/verify-email?email=${email}`);
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
                Gia nhập cộng đồng <span className="auth-hero-highlight">yêu sách</span>
              </h2>
              <p className="auth-hero-subtitle">
                Tạo tài khoản ngay hôm nay để nhận nhiều ưu đãi độc quyền và quản lý tủ sách cá nhân.
              </p>
            </div>

            <div className="auth-hero-features">
              <div className="auth-hero-feature-item">
                <TicketPercent size={18} className="auth-hero-feature-icon" />
                <span>Nhận ngay mã giảm giá cho thành viên mới</span>
              </div>
              <div className="auth-hero-feature-item">
                <CheckCircle2 size={18} className="auth-hero-feature-icon" />
                <span>Theo dõi đơn hàng & lịch sử mua sách</span>
              </div>
              <div className="auth-hero-feature-item">
                <CheckCircle2 size={18} className="auth-hero-feature-icon" />
                <span>Lưu địa chỉ giao hàng tiện lợi</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="auth-form-panel">
          <div className="auth-form-header">
            <h1 className="auth-title">Tạo tài khoản mới</h1>
            <p className="auth-subtitle">Điền thông tin bên dưới để bắt đầu trải nghiệm</p>
          </div>

          <AuthFormMessage error={error} />

          <form className="auth-form" onSubmit={handleSubmit}>
            {/* Full Name Field */}
            <div className="auth-field-group">
              <label htmlFor="reg-fullname" className="auth-label">
                Họ và tên
              </label>
              <div className="auth-input-wrapper">
                <User size={18} className="auth-input-icon" />
                <input
                  id="reg-fullname"
                  name="fullName"
                  type="text"
                  className={`auth-input${fieldErrors.fullName ? ' is-invalid' : ''}`}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  required
                />
              </div>
              {fieldErrors.fullName && <span className="field-error">{fieldErrors.fullName}</span>}
            </div>

            {/* Email Field */}
            <div className="auth-field-group">
              <label htmlFor="reg-email" className="auth-label">
                Email
              </label>
              <div className="auth-input-wrapper">
                <Mail size={18} className="auth-input-icon" />
                <input
                  id="reg-email"
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
              <label htmlFor="reg-password" className="auth-label">
                Mật khẩu
              </label>
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-input-icon" />
                <input
                  id="reg-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className={`auth-input has-toggle${fieldErrors.password ? ' is-invalid' : ''}`}
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
              {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
            </div>

            {/* Submit Button */}
            <button type="submit" className="btn auth-submit-btn" disabled={loading}>
              {loading ? (
                <span>Đang xử lý...</span>
              ) : (
                <>
                  <span>Tạo tài khoản</span>
                  <UserPlus size={18} />
                </>
              )}
            </button>
          </form>

          {/* Login Prompt */}
          <div className="auth-bottom-prompt">
            <span>Đã có tài khoản?</span>
            <Link to="/login" className="auth-register-link">
              Đăng nhập ngay <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
