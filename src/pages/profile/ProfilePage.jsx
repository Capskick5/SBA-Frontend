import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Bell,
  CreditCard,
  Eye,
  Heart,
  Lock,
  Mail,
  MapPin,
  Package,
  Pencil,
  Star,
  TicketPercent,
  User,
} from 'lucide-react';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { AuthFormMessage } from '../../components/auth/AuthFormFooter';
import { captureFormError } from '../../utils/formErrorUtils';
import { LoadingState, ErrorState } from '../../components/ui/State';
import { profileService } from '../../services/profileService';
import { useAuth } from '../../context/AuthContext';
import AddressesPage from './AddressesPage';
import OrdersPage from '../orders/OrdersPage';
import VouchersPage from './VouchersPage';

export default function ProfilePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [pendingPasswordChange, setPendingPasswordChange] = useState(null);
  const activeTab = searchParams.get('tab') || 'account';
  const [addressTitle, setAddressTitle] = useState('Address book');

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

  const handleChangePassword = (event) => {
    event.preventDefault();
    setPwdError(null);
    setPwdSuccess(null);
    setPwdFieldErrors({});
    const form = new FormData(event.currentTarget);
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');
    if (newPassword !== confirmPassword) {
      setPwdFieldErrors({ confirmPassword: 'Password confirmation does not match.' });
      return;
    }
    setPendingPasswordChange({
      currentPassword: form.get('currentPassword'),
      newPassword,
    });
    setShowPasswordConfirm(true);
  };

  const applyPasswordChange = async () => {
    if (!pendingPasswordChange) return;
    setPwdLoading(true);
    setPwdError(null);
    setPwdFieldErrors({});
    try {
      await profileService.changePassword(pendingPasswordChange);
      setShowPasswordConfirm(false);
      setPendingPasswordChange(null);
      await logout();
      navigate('/login', {
        replace: true,
        state: { message: 'Password changed successfully. Please log in again.' },
      });
    } catch (err) {
      setShowPasswordConfirm(false);
      captureFormError(err, setPwdError, setPwdFieldErrors);
    } finally {
      setPwdLoading(false);
    }
  };

  if (loading) return <LoadingState />;
  if (loadError) return <ErrorState text={loadError} />;

  const displayName = profile?.fullName || 'BookVerse customer';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const menuItems = [
    { id: 'account', label: 'Account information', icon: User },
    { id: 'notifications', label: 'My notifications', icon: Bell },
    { id: 'orders', label: 'Order management', icon: Package },
    { id: 'vouchers', label: 'My vouchers', icon: TicketPercent },
    { id: 'addresses', label: 'Address book', icon: MapPin },
    { id: 'payments', label: 'Payment information', icon: CreditCard },
    { id: 'reviews', label: 'Product reviews', icon: Star },
    { id: 'viewed', label: 'Viewed products', icon: Eye },
    { id: 'favorites', label: 'Favorite products', icon: Heart },
  ];

  const placeholderContent = {
    notifications: {
      title: 'My notifications',
      text: 'Notification preferences will appear here when this feature is available.',
    },
    payments: {
      title: 'Payment information',
      text: 'Saved payment methods will appear here when payment profile storage is available.',
    },
    reviews: {
      title: 'Product reviews',
      text: 'Your product reviews will appear here after you review purchased books.',
    },
    viewed: {
      title: 'Viewed products',
      text: 'Recently viewed books will appear here when browsing history is available.',
    },
    favorites: {
      title: 'Favorite products',
      text: 'Favorite books will appear here when wishlist support is available.',
    },
  };

  const renderProfilePanel = () => {
    if (activeTab === 'vouchers') {
      return (
        <div className="profile-content">
          <h1>My vouchers</h1>
          <div className="profile-card profile-embedded-card voucher-profile-card">
            <VouchersPage />
          </div>
        </div>
      );
    }

    if (activeTab === 'orders') {
      return (
        <div className="profile-content">
          <h1>Order management</h1>
          <div className="profile-card profile-embedded-card">
            <OrdersPage />
          </div>
        </div>
      );
    }

    if (activeTab === 'addresses') {
      return (
        <div className="profile-content">
          <h1>{addressTitle}</h1>
          <div className="profile-card profile-embedded-card">
            <AddressesPage onTitleChange={setAddressTitle} />
          </div>
        </div>
      );
    }

    if (activeTab !== 'account') {
      const content = placeholderContent[activeTab];
      return (
        <div className="profile-content">
          <h1>{content.title}</h1>
          <div className="profile-card profile-placeholder-card">
            <div>
              <h2>{content.title}</h2>
              <p>{content.text}</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="profile-content">
        <h1>Account information</h1>

        <div className="profile-card profile-account-card">
          <section className="profile-personal-panel">
            <div className="profile-section-heading">
              <h2>Personal information</h2>
            </div>

            <AuthFormMessage error={saveError} success={saveSuccess} />

            <form className="profile-form" onSubmit={handleSaveProfile} key={profile?.updatedAt}>
              <div className="profile-avatar-panel">
                <div className="profile-avatar profile-avatar-lg">{initials || 'BV'}</div>
                <button type="button" className="profile-avatar-edit" aria-label="Edit avatar" disabled>
                  <Pencil size={14} />
                </button>
              </div>

              <div className="profile-fields">
                <Input
                  label="Full name"
                  name="fullName"
                  defaultValue={profile?.fullName || ''}
                  error={saveFieldErrors.fullName}
                  required
                />
                <Input label="Email" defaultValue={profile?.email || ''} disabled />

                <label className="field">
                  <span>Nickname</span>
                  <input value="Not set" disabled />
                </label>

                <label className="field">
                  <span>Country</span>
                  <select defaultValue="Vietnam" disabled>
                    <option>Vietnam</option>
                  </select>
                </label>

                <Button type="submit" disabled={saveLoading} className="profile-save-btn">
                  {saveLoading ? 'Saving...' : 'Save changes'}
                </Button>
              </div>
            </form>
          </section>

          <aside className="profile-side-panel">
            <section className="profile-side-section">
              <h2>Phone and email</h2>
              <div className="profile-info-row">
                <Mail size={18} />
                <div>
                  <span>Email address</span>
                  <strong>{profile?.email || 'Not available'}</strong>
                </div>
                <button type="button" className="profile-outline-btn" disabled>Update</button>
              </div>
            </section>

            <section className="profile-side-section">
              <h2>Security</h2>
              <div className="profile-info-row">
                <Lock size={18} />
                <div>
                  <span>Password</span>
                  <strong>Change account password</strong>
                </div>
                <button
                  type="button"
                  className="profile-outline-btn"
                  onClick={() => setShowPasswordForm((current) => !current)}
                >
                  {showPasswordForm ? 'Cancel' : 'Update'}
                </button>
              </div>

              <AuthFormMessage error={pwdError} success={pwdSuccess} />

              {showPasswordForm && (
                <form className="profile-password-form" onSubmit={handleChangePassword}>
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
                  <Button type="submit" disabled={pwdLoading} className="profile-password-btn">
                    {pwdLoading ? 'Processing...' : 'Confirm'}
                  </Button>
                </form>
              )}
            </section>

          </aside>
        </div>
      </div>
    );
  };

  return (
    <>
      {showPasswordConfirm && (
        <ConfirmDialog
          title="Change password?"
          onCancel={() => {
            if (pwdLoading) return;
            setShowPasswordConfirm(false);
            setPendingPasswordChange(null);
          }}
          onConfirm={applyPasswordChange}
        >
          Change your password? You will be signed out.
        </ConfirmDialog>
      )}

      <section className="profile-page">
      <nav className="profile-breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span>/</span>
        <span>Account information</span>
      </nav>

      <div className="profile-layout">
        <aside className="profile-sidebar" aria-label="Account navigation">
          <div className="profile-sidebar-user">
            <div className="profile-avatar profile-avatar-sm">{initials || 'BV'}</div>
            <div>
              <span>Your account</span>
              <strong>{displayName}</strong>
            </div>
          </div>

          <div className="profile-menu">
            {menuItems.map(({ id, label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                className={`profile-menu-item${activeTab === id ? ' active' : ''}`}
                onClick={() => setSearchParams(id === 'account' ? {} : { tab: id })}
              >
                <Icon size={18} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </aside>

        {renderProfilePanel()}
      </div>
    </section>
    </>
  );
}
