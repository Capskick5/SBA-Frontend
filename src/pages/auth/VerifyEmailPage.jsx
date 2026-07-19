import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { AuthFormFooter, AuthFormMessage } from '../../components/auth/AuthFormFooter';
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
      setSuccess('Email verified successfully. You can now log in.');
    } catch (err) {
      captureFormError(err, setError, setFieldErrors);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    const email = document.querySelector('[name="email"]')?.value;
    if (!email) return;
    setResendLoading(true);
    setError(null);
    try {
      await authService.resendVerification({ email });
      setSuccess('A new OTP has been sent if the email exists.');
    } catch (err) {
      captureFormError(err, setError, setFieldErrors);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <section className="narrow">
      <h1>Verify Email</h1>
      <AuthFormMessage error={error} success={success} />
      <form className="form" onSubmit={handleSubmit}>
        <Input label="Email" name="email" type="email" defaultValue={emailDefault} error={fieldErrors.email} required />
        <Input label="OTP" name="otp" error={fieldErrors.otp} required />
        <Button type="submit" disabled={loading}>{loading ? 'Processing...' : 'Verify'}</Button>
      </form>
      <div className="actions">
        <Button type="button" onClick={handleResend} disabled={resendLoading}>
          {resendLoading ? 'Sending...' : 'Resend OTP'}
        </Button>
      </div>
      <AuthFormFooter>
        {success ? (
          <Link to="/login?registered=1">Go to login</Link>
        ) : (
          <Link to="/login">Back to login</Link>
        )}
      </AuthFormFooter>
    </section>
  );
}
