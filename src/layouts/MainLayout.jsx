import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import AiChatbot from '../components/ui/AiChatbot';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { checkServerOrderHistoryAndLock, getLockExpiration } from '../utils/userLockGuard';

export default function MainLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showLockDialog, setShowLockDialog] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setShowLockDialog(false);
      return;
    }

    let active = true;

    // 1. Fast check local storage
    if (getLockExpiration(user.id)) {
      setShowLockDialog(true);
      return;
    }

    // 2. Background check database via API
    checkServerOrderHistoryAndLock(user.id)
      .then((lockExpiresAt) => {
        if (active && lockExpiresAt) {
          setShowLockDialog(true);
        }
      })
      .catch((err) => console.error('Error checking lock status:', err));

    return () => {
      active = false;
    };
  }, [location.pathname, user?.id]);

  const handleLockConfirm = async () => {
    try {
      await logout();
    } catch (err) {
      console.error(err);
    }
    setShowLockDialog(false);
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <Header />
      <main className="page">{children}</main>
      <Footer />
      <AiChatbot />

      {showLockDialog && (
        <ConfirmDialog
          title="Tài khoản bị khóa"
          onCancel={handleLockConfirm}
          onConfirm={handleLockConfirm}
        >
          Tài khoản của bạn đã bị khóa tạm thời trong 15 phút do hủy liên tiếp 5 đơn hàng. Bạn sẽ bị đăng xuất khỏi hệ thống.
        </ConfirmDialog>
      )}
    </div>
  );
}

