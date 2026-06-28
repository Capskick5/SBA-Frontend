import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { AuthFormMessage } from '../../components/auth/AuthFormFooter';
import { captureFormError } from '../../utils/formErrorUtils';
import { LoadingState, ErrorState } from '../../components/ui/State';
import { profileService } from '../../services/profileService';
import { useAuth } from '../../context/AuthContext';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { refreshUser, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(null);
  const [saveFieldErrors, setSaveFieldErrors] = useState({});

  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState(null);
  const [pwdSuccess, setPwdSuccess] = useState(null);
  const [pwdFieldErrors, setPwdFieldErrors] = useState({});

  useEffect(() => {
    profileService.getProfile()
      .then(setProfile)
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setSaveLoading(true);
    setSaveError(null);
    setSaveSuccess(null);
    setSaveFieldErrors({});
    const form = new FormData(event.currentTarget);
    try {
      const updated = await profileService.updateProfile({ fullName: form.get('fullName') });
      setProfile(updated);
      refreshUser();
      setSaveSuccess('Profile updated successfully.');
    } catch (err) {
      captureFormError(err, setSaveError, setSaveFieldErrors);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setPwdLoading(true);
    setPwdError(null);
    setPwdSuccess(null);
    setPwdFieldErrors({});
    const form = new FormData(event.currentTarget);
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');
    if (newPassword !== confirmPassword) {
      setPwdFieldErrors({ confirmPassword: 'Password confirmation does not match.' });
      setPwdLoading(false);
      return;
    }
    try {
      await profileService.changePassword({
        currentPassword: form.get('currentPassword'),
        newPassword,
      });
      await logout();
      navigate('/login', {
        replace: true,
        state: { message: 'Password changed successfully. Please log in again.' },
      });
    } catch (err) {
      captureFormError(err, setPwdError, setPwdFieldErrors);
    } finally {
      setPwdLoading(false);
    }
  };

  if (loading) return <LoadingState />;
  if (loadError) return <ErrorState text={loadError} />;

  return (
    <section className="narrow stack">
      <h1>Profile</h1>
      <p className="auth-footer">
        <Link to="/profile/addresses">Manage addresses</Link>
      </p>

      <div className="form-section">
        <h2>Personal Information</h2>
        <AuthFormMessage error={saveError} success={saveSuccess} />
        <form className="form" onSubmit={handleSaveProfile} key={profile?.updatedAt}>
          <Input
            label="Full name"
            name="fullName"
            defaultValue={profile?.fullName || ''}
            error={saveFieldErrors.fullName}
            required
          />
          <Input label="Email" defaultValue={profile?.email || ''} disabled />
          <Button type="submit" disabled={saveLoading}>
            {saveLoading ? 'Saving...' : 'Save'}
          </Button>
        </form>
      </div>

      <div className="form-section">
        <h2>Change Password</h2>
        <AuthFormMessage error={pwdError} success={pwdSuccess} />
        <form className="form" onSubmit={handleChangePassword}>
          <Input
            label="Current password"
            name="currentPassword"
            type="password"
            error={pwdFieldErrors.currentPassword}
            required
          />
          <Input
            label="New password"
            name="newPassword"
            type="password"
            error={pwdFieldErrors.newPassword}
            required
          />
          <Input
            label="Confirm password"
            name="confirmPassword"
            type="password"
            error={pwdFieldErrors.confirmPassword}
            required
          />
          <Button type="submit" disabled={pwdLoading}>
            {pwdLoading ? 'Processing...' : 'Change password'}
          </Button>
        </form>
      </div>
    </section>
  );
}
