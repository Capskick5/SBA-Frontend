import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
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
import MyReviewsPage from './MyReviewsPage';
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
  const [addressTitle, setAddressTitle] = useState('Sổ địa chỉ');

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
      setSaveSuccess('Cập nhật hồ sơ thành công.');
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
      setPwdFieldErrors({ confirmPassword: 'Xác nhận mật khẩu không khớp.' });
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
        state: { message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.' },
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

  const displayName = profile?.fullName || 'Khách hàng BookVerse';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const menuItems = [
    { id: 'account', label: 'Thông tin tài khoản', icon: User },
    { id: 'orders', label: 'Quản lý đơn hàng', icon: Package },
    { id: 'vouchers', label: 'Voucher của tôi', icon: TicketPercent },
    { id: 'addresses', label: 'Sổ địa chỉ', icon: MapPin },
    { id: 'reviews', label: 'Đánh giá sản phẩm', icon: Star },
  ];

  const renderProfilePanel = () => {
    if (activeTab === 'vouchers') {
      return (
        <div className="profile-content">
          <h1>Voucher của tôi</h1>
          <div className="profile-card profile-embedded-card voucher-profile-card">
            <VouchersPage />
          </div>
        </div>
      );
    }

    if (activeTab === 'orders') {
      return (
        <div className="profile-content">
          <h1>Quản lý đơn hàng</h1>
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

    if (activeTab === 'reviews') {
      return (
        <div className="profile-content">
          <h1>Đánh giá sản phẩm</h1>
          <div className="profile-card profile-embedded-card">
            <MyReviewsPage />
          </div>
        </div>
      );
    }

    return (
      <div className="profile-content">
        <h1>Thông tin tài khoản</h1>

        <div className="profile-card profile-account-card">
          <section className="profile-personal-panel">
            <div className="profile-section-heading">
              <h2>Thông tin cá nhân</h2>
            </div>

            <AuthFormMessage error={saveError} success={saveSuccess} />

            <form className="profile-form" onSubmit={handleSaveProfile} key={profile?.updatedAt}>
              <div className="profile-avatar-panel">
                <div className="profile-avatar profile-avatar-lg">{initials || 'BV'}</div>
                <button type="button" className="profile-avatar-edit" aria-label="Sửa ảnh đại diện" disabled>
                  <Pencil size={14} />
                </button>
              </div>

              <div className="profile-fields">
                <Input
                  label="Họ và tên"
                  name="fullName"
                  defaultValue={profile?.fullName || ''}
                  error={saveFieldErrors.fullName}
                  required
                />
                <Input label="Email" defaultValue={profile?.email || ''} disabled />

                <label className="field">
                  <span>Biệt danh</span>
                  <input value="Chưa đặt" disabled />
                </label>

                <label className="field">
                  <span>Quốc gia</span>
                  <select defaultValue="Vietnam" disabled>
                    <option>Vietnam</option>
                  </select>
                </label>

                <Button type="submit" disabled={saveLoading} className="profile-save-btn">
                  {saveLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                </Button>
              </div>
            </form>
          </section>

          <aside className="profile-side-panel">
            <section className="profile-side-section">
              <h2>Điện thoại và email</h2>
              <div className="profile-info-row">
                <Mail size={18} />
                <div>
                  <span>Địa chỉ email</span>
                  <strong>{profile?.email || 'Không có'}</strong>
                </div>
                <button type="button" className="profile-outline-btn" disabled>Cập nhật</button>
              </div>
            </section>

            <section className="profile-side-section">
              <h2>Bảo mật</h2>
              <div className="profile-info-row">
                <Lock size={18} />
                <div>
                  <span>Mật khẩu</span>
                  <strong>Đổi mật khẩu tài khoản</strong>
                </div>
                <button
                  type="button"
                  className="profile-outline-btn"
                  onClick={() => setShowPasswordForm((current) => !current)}
                >
                  {showPasswordForm ? 'Hủy' : 'Cập nhật'}
                </button>
              </div>

              <AuthFormMessage error={pwdError} success={pwdSuccess} />

              {showPasswordForm && (
                <form className="profile-password-form" onSubmit={handleChangePassword}>
                  <Input
                    label="Mật khẩu hiện tại"
                    name="currentPassword"
                    type="password"
                    error={pwdFieldErrors.currentPassword}
                    required
                  />
                  <Input
                    label="Mật khẩu mới"
                    name="newPassword"
                    type="password"
                    error={pwdFieldErrors.newPassword}
                    required
                  />
                  <Input
                    label="Xác nhận mật khẩu"
                    name="confirmPassword"
                    type="password"
                    error={pwdFieldErrors.confirmPassword}
                    required
                  />
                  <Button type="submit" disabled={pwdLoading} className="profile-password-btn">
                    {pwdLoading ? 'Đang xử lý...' : 'Xác nhận'}
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
          title="Đổi mật khẩu?"
          onCancel={() => {
            if (pwdLoading) return;
            setShowPasswordConfirm(false);
            setPendingPasswordChange(null);
          }}
          onConfirm={applyPasswordChange}
        >
          Bạn có muốn đổi mật khẩu? Bạn sẽ bị đăng xuất sau khi đổi.
        </ConfirmDialog>
      )}

      <section className="profile-page">
      <nav className="profile-breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Trang chủ</Link>
        <span>/</span>
        <span>Thông tin tài khoản</span>
      </nav>

      <div className="profile-layout">
        <aside className="profile-sidebar" aria-label="Account navigation">
          <div className="profile-sidebar-user">
            <div className="profile-avatar profile-avatar-sm">{initials || 'BV'}</div>
            <div>
              <span>Tài khoản của bạn</span>
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
