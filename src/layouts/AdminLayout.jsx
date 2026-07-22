import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminService } from '../services/adminService';
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
  LogOut
} from 'lucide-react';

const links = [
  ['/admin', 'Dashboard', LayoutDashboard],
  ['/admin/books', 'Books', BookOpen],
  ['/admin/categories', 'Categories', FolderOpen],
  ['/admin/banners', 'Banners', Image],
  ['/admin/gift-wraps', 'Gift Wraps', Gift],
  ['/admin/orders', 'Orders', ShoppingBag, 'orders'],
  ['/admin/refunds', 'Refund Requests', RotateCcw, 'refunds'],
  ['/admin/campaigns', 'Campaigns', Megaphone],
  ['/admin/vouchers', 'Vouchers', Ticket],
  ['/admin/users', 'Users', Users],
  ['/admin/reviews', 'Reviews', MessageSquare],
  ['/admin/inventory', 'Inventory Management', ClipboardList],
  ['/admin/rag', 'RAG Catalog', Database],
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
          const pendingCount = items.filter(o => o.status === 'PENDING' || o.status === 'PENDING_PAYMENT').length;
          setPendingOrdersCount(res?.totalItems || pendingCount);
        }
      } catch {
        // Fallback silently if filter param not supported
      }

      try {
        const refundRes = await adminService.getRefundRequests({ status: 'UNDER_REVIEW', page: 0, size: 1 });
        if (isMounted && refundRes) {
          setPendingRefundsCount(refundRes?.totalItems ?? refundRes?.totalElements ?? 0);
        }
      } catch {
        // Ignore
      }
    };
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 30000); // refresh every 30s
    window.addEventListener('refund_updated', fetchPendingCount);
    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('refund_updated', fetchPendingCount);
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
            aria-label={collapsed ? 'Mở sidebar' : 'Thu gọn sidebar'}
          >
            <Menu size={20} />
          </button>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {links.map(([to, label, Icon, key]) => (
            <NavLink 
              key={to} 
              to={to} 
              end={to === '/admin'}
              title={collapsed ? label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: collapsed ? '0' : '12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                padding: collapsed ? '12px' : '10px 16px',
                position: 'relative'
              }}
            >
              <Icon size={20} />
              {!collapsed && <span>{label}</span>}
              {key === 'orders' && pendingOrdersCount > 0 && (
                <span 
                  className="admin-nav-badge"
                  style={collapsed ? { position: 'absolute', top: '4px', right: '4px', margin: 0 } : {}}
                  title={`${pendingOrdersCount} đơn mới cần xử lý`}
                >
                  {pendingOrdersCount > 99 ? '99+' : pendingOrdersCount}
                </span>
              )}
              {key === 'refunds' && pendingRefundsCount > 0 && (
                <span 
                  className={`admin-nav-badge admin-nav-badge-warning`}
                  style={collapsed ? { position: 'absolute', top: '4px', right: '4px', margin: 0 } : {}}
                  title={`${pendingRefundsCount} yêu cầu hoàn tiền cần xử lý`}
                >
                  {pendingRefundsCount > 99 ? '99+' : pendingRefundsCount}
                </span>
              )}
            </NavLink>
          ))}
        </div>
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
