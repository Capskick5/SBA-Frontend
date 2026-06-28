import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { AuthFormFooter, AuthFormMessage } from '../../components/auth/AuthFormFooter';
import { captureFormError } from '../../utils/formErrorUtils';
import { authService } from '../../services/authService';
const MOCK_OTP = '123456';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const emailDefault = params.get('email') || '';

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
    <section className="narrow">
      <h1>Reset Password</h1>
      <AuthFormMessage error={error} />
      <form className="form" onSubmit={handleSubmit}>
        <Input label="Email" name="email" type="email" defaultValue={emailDefault} error={fieldErrors.email} required />
        <Input label="OTP" name="otp" error={fieldErrors.otp} required />
        <Input label="New password" name="newPassword" type="password" error={fieldErrors.newPassword} required />
        <p className="form-hint">Demo OTP: {MOCK_OTP}</p>
        <Button type="submit" disabled={loading}>{loading ? 'Processing...' : 'Reset'}</Button>
      </form>
      <AuthFormFooter>
        <Link to="/login">Back to login</Link>
      </AuthFormFooter>
    </section>
  );
}
