import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminService } from '../services/adminService';
import { refundService } from '../services/refundService';
import {
  LayoutDashboard,
  BookOpen,
  FolderOpen,
  ShoppingBag,
  Ticket,
  Users,
  MessageSquare,
  ClipboardList,
  RotateCcw,
  Database,
  Image,
  Gift,
  Megaphone,
  Menu,
  LogOut,
} from 'lucide-react';

const links = [
  ['/admin', 'Bảng điều khiển', LayoutDashboard],
  ['/admin/books', 'Kho sách', BookOpen],
  ['/admin/categories', 'Danh mục', FolderOpen],
  ['/admin/banners', 'Banner', Image],
  ['/admin/gift-wraps', 'Gói quà', Gift],
  ['/admin/orders', 'Đơn hàng', ShoppingBag, 'orders'],
  ['/admin/refunds', 'Yêu cầu hoàn', RotateCcw, 'refunds'],
  ['/admin/campaigns', 'Chiến dịch', Megaphone],
  ['/admin/vouchers', 'Mã giảm giá', Ticket],
  ['/admin/users', 'Người dùng', Users],
  ['/admin/reviews', 'Đánh giá', MessageSquare],
  ['/admin/inventory', 'Quản lý kho', ClipboardList],
  ['/admin/rag', 'Danh mục RAG', Database],
];

export default function AdminLayout({ children }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('admin_sidebar_collapsed') === 'true';
  });
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [pendingRefundsCount, setPendingRefundsCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const fetchPendingCount = async () => {
      try {
        const res = await adminService.getOrders({ page: 0, size: 100 });
        if (isMounted && res) {
          const items = res?.items || res?.content || res?.data?.items || [];
          const pendingCount = items.filter((o) => o.status === 'PENDING' || o.status === 'PENDING_PAYMENT').length;
          setPendingOrdersCount(res?.totalItems || pendingCount);
        }
      } catch {
        // ignore
      }

      try {
        const refunds = await refundService.getRefundRequests();
        const pendingRef = refunds.filter((r) => r.status === 'PENDING').length;
        if (isMounted) setPendingRefundsCount(pendingRef);
      } catch {
        // ignore
      }
    };
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('admin_sidebar_collapsed', String(next));
      return next;
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className={`admin-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          {!collapsed && <h2>Quản trị</h2>}
          <button
            type="button"
            className="admin-sidebar-icon-btn"
            onClick={toggleSidebar}
            aria-label={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          >
            <Menu size={20} />
          </button>
        </div>

        <nav className="admin-sidebar-nav" aria-label="Menu quản trị">
          {links.map(([to, label, Icon, key]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/admin'}
              title={collapsed ? label : undefined}
              className={({ isActive }) => `admin-sidebar-link${isActive ? ' active' : ''}`}
            >
              <Icon size={20} />
              {!collapsed && <span>{label}</span>}
              {key === 'orders' && pendingOrdersCount > 0 && (
                <span
                  className={`admin-nav-badge${collapsed ? ' admin-nav-badge-collapsed' : ''}`}
                  title={`${pendingOrdersCount} đơn mới cần xử lý`}
                >
                  {pendingOrdersCount > 99 ? '99+' : pendingOrdersCount}
                </span>
              )}
              {key === 'refunds' && pendingRefundsCount > 0 && (
                <span
                  className={`admin-nav-badge admin-nav-badge-warn${collapsed ? ' admin-nav-badge-collapsed' : ''}`}
                  title={`${pendingRefundsCount} yêu cầu hoàn cần xử lý`}
                >
                  {pendingRefundsCount > 99 ? '99+' : pendingRefundsCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <button
            type="button"
            className="admin-sidebar-logout"
            onClick={handleLogout}
            title={collapsed ? 'Đăng xuất' : undefined}
          >
            <LogOut size={18} />
            {!collapsed && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>
      <main className="admin-content">{children}</main>
    </div>
  );
}
