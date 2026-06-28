import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { AuthFormFooter, AuthFormMessage } from '../../components/auth/AuthFormFooter';
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
    <section className="narrow">
      <h1>Forgot Password</h1>
      <AuthFormMessage error={error} />
      <form className="form" onSubmit={handleSubmit}>
        <Input label="Email" name="email" type="email" error={fieldErrors.email} required />
        <Button type="submit" disabled={loading}>{loading ? 'Processing...' : 'Send OTP'}</Button>
      </form>
      <AuthFormFooter>
        <Link to="/login">Back to login</Link>
      </AuthFormFooter>
    </section>
  );
}
