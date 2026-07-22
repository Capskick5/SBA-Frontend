import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { AuthFormFooter, AuthFormMessage } from '../../components/auth/AuthFormFooter';
import { captureFormError } from '../../utils/formErrorUtils';
import { authService } from '../../services/authService';

export default function RegisterPage() {
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
    <section className="narrow">
      <h1>Đăng ký</h1>
      <AuthFormMessage error={error} />
      <form className="form" onSubmit={handleSubmit}>
        <Input label="Họ và tên" name="fullName" error={fieldErrors.fullName} required />
        <Input label="Email" name="email" type="email" error={fieldErrors.email} required />
        <Input label="Mật khẩu" name="password" type="password" error={fieldErrors.password} required />
        <Button type="submit" disabled={loading}>{loading ? 'Đang xử lý...' : 'Tạo tài khoản'}</Button>
      </form>
      <AuthFormFooter>
        <Link to="/login">Đã có tài khoản? Đăng nhập</Link>
      </AuthFormFooter>
    </section>
  );
}
