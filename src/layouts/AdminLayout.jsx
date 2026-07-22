import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminService } from '../services/adminService';
import { refundService } from '../services/refundService';
import {
  ADMIN_USERS_SEEN_EVENT,
  countNewUsers,
  getUsersLastSeenAt,
  markUsersAsSeen,
} from '../utils/adminUsersBadge';
import {
  ADMIN_REVIEWS_SEEN_EVENT,
  countNewReviews,
  getReviewsLastSeenAt,
  markReviewsAsSeen,
} from '../utils/adminReviewsBadge';
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
  ['/admin/users', 'Người dùng', Users, 'users'],
  ['/admin/reviews', 'Đánh giá', MessageSquare, 'reviews'],
  ['/admin/inventory', 'Quản lý kho', ClipboardList],
  ['/admin/rag', 'Danh mục RAG', Database],
];

/** Orders that still need admin attention (exclude delivered / cancelled / refunded). */
const ACTIONABLE_ORDER_STATUSES = new Set([
  'PENDING',
  'PENDING_PAYMENT',
  'PAID',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'RE_DELIVERY',
  'PAYMENT_FAILED',
  'REFUND_REQUESTED',
]);

/** Refunds awaiting review or still in progress (exclude completed / rejected). */
const ACTIONABLE_REFUND_STATUSES = new Set([
  'RETURN_REQUESTED',
  'WAITING_EVIDENCE',
  'UNDER_REVIEW',
  'PICKUP_PENDING',
  'RETURN_RECEIVED',
  'INSPECTING',
  'RESHIP_PENDING',
  'EXCHANGE_SHIPPING',
  'REFUND_PROCESSING',
]);

function extractUsers(res) {
  const body = res?.data || res;
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.data?.items)) return body.data.items;
  if (Array.isArray(body)) return body;
  return [];
}

function extractReviews(res) {
  const body = res?.data || res;
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.content)) return body.content;
  if (Array.isArray(body?.data?.items)) return body.data.items;
  if (Array.isArray(body)) return body;
  return [];
}

export default function AdminLayout({ children }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('admin_sidebar_collapsed') === 'true';
  });
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [pendingRefundsCount, setPendingRefundsCount] = useState(0);
  const [newUsersCount, setNewUsersCount] = useState(0);
  const [newReviewsCount, setNewReviewsCount] = useState(0);

  useEffect(() => {
    if (location.pathname.startsWith('/admin/users')) {
      markUsersAsSeen();
      setNewUsersCount(0);
    }
    if (location.pathname.startsWith('/admin/reviews')) {
      markReviewsAsSeen();
      setNewReviewsCount(0);
    }
  }, [location.pathname]);

  useEffect(() => {
    let isMounted = true;
    const fetchPendingCount = async () => {
      try {
        const res = await adminService.getOrders({ page: 0, size: 200, sort: 'createdAt,desc' });
        if (isMounted && res) {
          const items = res?.items || res?.content || res?.data?.items || [];
          const actionableCount = items.filter((order) => ACTIONABLE_ORDER_STATUSES.has(order.status)).length;
          setPendingOrdersCount(actionableCount);
        }
      } catch {
        // ignore
      }

      try {
        const refunds = await refundService.getRefundRequests();
        const list = Array.isArray(refunds) ? refunds : refunds?.items || refunds?.content || [];
        const actionableRefunds = list.filter((refund) => ACTIONABLE_REFUND_STATUSES.has(refund.status)).length;
        if (isMounted) setPendingRefundsCount(actionableRefunds);
      } catch {
        // ignore
      }

      try {
        if (location.pathname.startsWith('/admin/users')) {
          if (isMounted) setNewUsersCount(0);
        } else {
          const usersRes = await adminService.getUsers({ page: 0, size: 100, sort: 'createdAt,desc' });
          const users = extractUsers(usersRes);
          if (isMounted) setNewUsersCount(countNewUsers(users, getUsersLastSeenAt()));
        }
      } catch {
        // ignore
      }

      try {
        if (location.pathname.startsWith('/admin/reviews')) {
          if (isMounted) setNewReviewsCount(0);
        } else {
          const reviewsRes = await adminService.getReviews({ page: 0, size: 100, sort: 'createdAt,desc' });
          const reviews = extractReviews(reviewsRes);
          if (isMounted) setNewReviewsCount(countNewReviews(reviews, getReviewsLastSeenAt()));
        }
      } catch {
        // ignore
      }
    };
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 30000);
    const onUsersSeen = () => {
      if (isMounted) setNewUsersCount(0);
    };
    const onReviewsSeen = () => {
      if (isMounted) setNewReviewsCount(0);
    };
    window.addEventListener(ADMIN_USERS_SEEN_EVENT, onUsersSeen);
    window.addEventListener(ADMIN_REVIEWS_SEEN_EVENT, onReviewsSeen);
    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener(ADMIN_USERS_SEEN_EVENT, onUsersSeen);
      window.removeEventListener(ADMIN_REVIEWS_SEEN_EVENT, onReviewsSeen);
    };
  }, [location.pathname]);

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
                  title={`${pendingOrdersCount} đơn đang chờ xử lý / trong tiến trình`}
                >
                  {pendingOrdersCount > 99 ? '99+' : pendingOrdersCount}
                </span>
              )}
              {key === 'refunds' && pendingRefundsCount > 0 && (
                <span
                  className={`admin-nav-badge${collapsed ? ' admin-nav-badge-collapsed' : ''}`}
                  title={`${pendingRefundsCount} yêu cầu hoàn cần xử lý`}
                >
                  {pendingRefundsCount > 99 ? '99+' : pendingRefundsCount}
                </span>
              )}
              {key === 'users' && newUsersCount > 0 && (
                <span
                  className={`admin-nav-badge${collapsed ? ' admin-nav-badge-collapsed' : ''}`}
                  title={`${newUsersCount} người dùng mới chưa xem`}
                >
                  {newUsersCount > 99 ? '99+' : newUsersCount}
                </span>
              )}
              {key === 'reviews' && newReviewsCount > 0 && (
                <span
                  className={`admin-nav-badge${collapsed ? ' admin-nav-badge-collapsed' : ''}`}
                  title={`${newReviewsCount} đánh giá mới chưa xem`}
                >
                  {newReviewsCount > 99 ? '99+' : newReviewsCount}
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
