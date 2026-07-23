import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingBag } from 'lucide-react';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Pagination from '../../components/catalog/Pagination';
import { ErrorState, LoadingState } from '../../components/ui/State';
import OrderStatusBadge from '../../components/orders/OrderStatusBadge';
import { orderService } from '../../services/orderService';
import { bookService } from '../../services/bookService';
import { refundService } from '../../services/refundService';
import { cartFacade } from '../../services/cartFacade';
import { notifyCartUpdated } from '../../utils/cartEvents';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { formatPaymentTimeLeft } from '../../utils/paymentExpiry';
import { showToast } from '../../utils/toast';
import { useAuth } from '../../context/AuthContext';
import {
  clearPendingPaymentCache,
  getPendingPaymentUserMessage,
} from '../../utils/pendingOrderGuard';

const TABS = [
  { id: 'ALL', label: 'Tất cả đơn' },
  { id: 'PENDING_PAYMENT', label: 'Chờ thanh toán' },
  { id: 'PROCESSING', label: 'Đang xử lý' },
  { id: 'SHIPPED', label: 'Đang giao' },
  { id: 'DELIVERED', label: 'Đã giao' },
  { id: 'CANCELLED', label: 'Đã hủy' },
];

const PAGE_SIZE = 10;

export default function OrdersPage({ initialTab = 'ALL' }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [rebuyingId, setRebuyingId] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [resumingId, setResumingId] = useState(null);
  const [showLockDialog, setShowLockDialog] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const isRefundTab = activeTab === 'REFUND_REQUESTED';
      const filter = (activeTab === 'ALL' || isRefundTab)
        ? {}
        : activeTab === 'PROCESSING'
          ? { statuses: ['PAID', 'PROCESSING', 'PACKED'] }
        : activeTab === 'SHIPPED'
          ? { statuses: ['SHIPPED', 'RE_DELIVERY'] }
          : { status: activeTab };
      const result = await orderService.getOrdersPage({
        page: isRefundTab ? 0 : page,
        size: isRefundTab ? 100 : PAGE_SIZE,
        search: appliedSearch,
        ...filter,
      });
      const rawOrders = result.items;

      const bookCache = {};
      const fetchBookCover = async (bookId) => {
        if (!bookId) return null;
        if (bookCache[bookId] !== undefined) return bookCache[bookId];
        try {
          const book = await bookService.getBookById(bookId);
          bookCache[bookId] = book?.coverUrl || null;
          return bookCache[bookId];
        } catch (err) {
          console.error(`Failed to load book cover for #${bookId}:`, err);
          bookCache[bookId] = null;
          return null;
        }
      };

      // Fetch details in parallel to obtain the line items & refund request
      const detailedOrders = await Promise.all(
        rawOrders.map(async (order) => {
          try {
            const details = await orderService.getOrderById(order.id);
            const items = details?.items || [];

            // Resolve covers for items
            const itemsWithCovers = await Promise.all(
              items.map(async (item) => {
                const cover = await fetchBookCover(item.bookId);
                return {
                  ...item,
                  coverUrl: cover || item.coverUrl || item.bookCoverUrl,
                };
              })
            );

            let refundReq = null;
            try {
              refundReq = await refundService.getRefundByOrderId(order.id);
            } catch {
              refundReq = null;
            }

            return {
              ...order,
              items: itemsWithCovers,
              addressSnapshot: details?.addressSnapshot,
              statusHistory: details?.statusHistory,
              refundRequest: refundReq,
            };
          } catch (err) {
            console.error(`Failed to load details for order #${order.id}:`, err);
            return { ...order, items: [] };
          }
        })
      );

      // Sort by ID descending (newest first)
      detailedOrders.sort((a, b) => b.id - a.id);

      let finalOrders = detailedOrders;
      if (isRefundTab) {
        finalOrders = detailedOrders.filter((o) => !!o.refundRequest);
        setTotalItems(finalOrders.length);
        setTotalPages(Math.ceil(finalOrders.length / PAGE_SIZE) || 0);
        const startIdx = page * PAGE_SIZE;
        finalOrders = finalOrders.slice(startIdx, startIdx + PAGE_SIZE);
      } else {
        setTotalPages(result.totalPages);
        setTotalItems(result.totalItems);
      }

      setOrders(finalOrders);
    } catch (err) {
      console.error('Failed to load orders:', err);
      setError('Không thể tải đơn hàng. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, appliedSearch, page]);

  useEffect(() => {
    Promise.resolve().then(loadOrders);
  }, [loadOrders]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const handleRebuy = async (order) => {
    if (rebuyingId) return;
    setRebuyingId(order.id);
    try {
      let lastCart = null;
      for (const item of order.items) {
        if (item.bookId) {
          lastCart = await cartFacade.addItem({ id: item.bookId }, item.quantity);
        }
      }
      if (lastCart) {
        notifyCartUpdated(lastCart);
      }
      navigate('/cart');
    } catch (err) {
      console.error('Failed to rebuy order items:', err);
      showToast(
        getPendingPaymentUserMessage(err) || 'Không thể mua lại đơn hàng này. Vui lòng thử lại.',
        'error',
      );
    } finally {
      setRebuyingId(null);
    }
  };

  const getBookCover = (item) => {
    return item.coverUrl || item.bookCoverUrl || `https://placehold.co/120x170?text=${encodeURIComponent(item.title || 'Sách')}`;
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(0);
    setAppliedSearch(searchQuery.trim());
  };

  const handleLockConfirm = async () => {
    try {
      const { authService } = await import('../../services/authService');
      await authService.logout();
    } catch (err) {
      console.error(err);
    }
    navigate('/login');
  };

  const handleCancelPendingOrder = async () => {
    if (!cancelTarget || cancellingId) return;

    setCancellingId(cancelTarget.id);
    try {
      const cancelledOrder = await orderService.cancelPendingOrder(cancelTarget.id);
      clearPendingPaymentCache();
      setCancelTarget(null);
      showToast(`Đơn hàng #${cancelledOrder.id} đã được hủy.`, 'success');
      if (orders.length === 1 && page > 0) {
        setPage((current) => current - 1);
      } else {
        await loadOrders();
      }

      if (user?.id) {
        const { checkServerOrderHistoryAndLock } = await import('../../utils/userLockGuard');
        const lockExpiresAt = await checkServerOrderHistoryAndLock(user.id);
        if (lockExpiresAt) {
          setShowLockDialog(true);
          return;
        }
      }
    } catch (err) {
      showToast(err?.message || 'Không thể hủy đơn hàng này. Vui lòng thử lại.', 'error');
    } finally {
      setCancellingId(null);
    }
  };

  const handleContinuePayment = async (order) => {
    if (resumingId) return;

    setResumingId(order.id);
    try {
      const paymentLink = await orderService.getPendingPaymentLink(order.id);
      window.location.assign(paymentLink.checkoutUrl);
    } catch (err) {
      showToast(err?.message || 'Không thể tiếp tục thanh toán. Vui lòng thử lại.', 'error');
      await loadOrders();
      setResumingId(null);
    }
  };

  return (
    <section className="stack orders-page">
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text)', margin: '0' }}>
        Đơn hàng của tôi
      </h1>

      <div className="orders-panel-toolbar">
        {/* Tabs list */}
        <div className="orders-tabs-wrapper">
          <ul className="orders-tabs">
            {TABS.map((tab) => (
              <li key={tab.id} style={{ flex: 1 }}>
                <button
                  type="button"
                  className={`orders-tab ${activeTab === tab.id ? 'is-active' : ''}`}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setAppliedSearch('');
                    setSearchQuery('');
                    setPage(0);
                  }}
                >
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Search Input Bar */}
        <form onSubmit={handleSearchSubmit} className="orders-search-wrapper">
          <Search size={18} className="orders-search-icon" />
          <input
            type="text"
            className="orders-search-input"
            placeholder="Tìm đơn theo mã đơn hoặc tên sản phẩm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="orders-search-divider" />
          <button type="submit" className="orders-search-btn">
            Tìm đơn
          </button>
        </form>
      </div>

      <div className="orders-panel-body">
      {/* Main Content Area */}
      {loading ? (
        <LoadingState text="Đang tải đơn hàng..." />
      ) : error ? (
        <ErrorState text={error}>
          <Button onClick={loadOrders}>Thử lại</Button>
        </ErrorState>
      ) : orders.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', background: 'var(--surface)', borderRadius: 'var(--radius-md)', color: 'var(--muted)', marginTop: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <ShoppingBag size={48} style={{ color: 'var(--brand-light)', marginBottom: '16px' }} />
          <p style={{ fontSize: '1.1rem', marginBottom: '8px', color: 'var(--text)', fontWeight: 'bold' }}>
            {appliedSearch ? 'Không tìm thấy đơn phù hợp' : 'Chưa có đơn hàng'}
          </p>
          <p style={{ fontSize: '0.9rem', marginBottom: '20px' }}>
            {appliedSearch ? 'Thử từ khóa khác.' : 'Bạn chưa đặt đơn hàng nào.'}
          </p>
          <Link to="/"><Button>Tiếp tục mua sắm</Button></Link>
        </div>
      ) : (
        <>
          <div className="orders-page-count">Hiển thị {orders.length} / {totalItems} đơn</div>
          <div className="order-cards-list">
            {orders.map((order) => {
            const isRebuying = rebuyingId === order.id;

            return (
              <div key={order.id} className="order-card">
                {/* Header: Order ID, Date & Status */}
                <div className="order-card-header">
                  <div className="order-card-info">
                    <span className="order-card-id">Đơn #{order.id}</span>
                    <span className="order-card-date">Đặt ngày {formatDateTime(order.createdAt)}</span>
                    {order.deliveryType === 'GIFT' && (
                      <span className="order-card-gift-badge">Đơn quà · Đã gói quà</span>
                    )}
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>

                {/* Body: Product List */}
                <div className="order-card-body">
                  {order.items.map((item, idx) => (
                    <div key={`${order.id}-item-${idx}`} className="order-item-row">
                      <div className="order-item-cover-wrapper">
                        <img
                          src={getBookCover(item)}
                          alt={item.title || 'Bìa sách'}
                          className="order-item-cover"
                          onError={(e) => {
                            e.target.src = `https://placehold.co/120x170?text=${encodeURIComponent(item.title || 'Sách')}`;
                          }}
                        />
                      </div>
                      <div className="order-item-details">
                        <h4 className="order-item-title">{item.title}</h4>
                        <span className="order-item-qty">Số lượng: x{item.quantity}</span>
                      </div>
                      <div className="order-item-price">
                        {formatCurrency(item.lineTotal || 0)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer: Order Total & Action buttons */}
                <div className="order-card-footer">
                  <div className="order-card-shipping">
                    {order.status === 'SHIPPED' && (
                      <span>Đang vận chuyển | Đơn vị: GHTK</span>
                    )}
                  </div>
                  <div className="order-card-summary">
                    <div className="order-card-total-row">
                      <span>Tổng cộng:</span>
                      <span className="order-card-total-price">
                        {formatCurrency(order.total || 0)}
                      </span>
                    </div>
                    <div className="order-card-actions">
                      {order.status === 'PENDING_PAYMENT' && (
                        <div className="pending-payment-actions">
                          <span className="pending-payment-countdown">
                            {formatPaymentTimeLeft(order.expiresAt, now)}
                          </span>
                          <Button
                            type="button"
                            loading={resumingId === order.id}
                            disabled={Boolean(cancellingId) || Boolean(resumingId)}
                            onClick={() => handleContinuePayment(order)}
                          >
                            Tiếp tục thanh toán
                          </Button>
                          <Button
                            type="button"
                            className="pending-payment-cancel"
                            disabled={Boolean(cancellingId) || Boolean(resumingId)}
                            onClick={() => setCancelTarget(order)}
                          >
                            Hủy đơn
                          </Button>
                        </div>
                      )}
                      <Link to={`/orders/${order.id}`} className="btn btn-outline">
                        Xem chi tiết
                      </Link>
                      {/* Only allow Rebuying if status is completed, processing or shipped */}
                      {order.status !== 'PENDING_PAYMENT' && (
                        <Button
                          loading={isRebuying}
                          disabled={isRebuying}
                          onClick={() => handleRebuy(order)}
                        >
                          Mua lại
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
            })}
          </div>
          {!appliedSearch && (
            <Pagination
              currentPage={page + 1}
              totalPages={totalPages}
              onPageChange={(nextPage) => setPage(nextPage - 1)}
            />
          )}
        </>
      )}
      </div>

      {cancelTarget && (
        <ConfirmDialog
          title="Hủy đơn chờ thanh toán?"
          onCancel={() => {
            if (!cancellingId) setCancelTarget(null);
          }}
          onConfirm={handleCancelPendingOrder}
        >
          Đơn #{cancelTarget.id} sẽ bị hủy và số lượng đã giữ sẽ được trả lại kho. Thao tác này không thể hoàn tác.
        </ConfirmDialog>
      )}

      {showLockDialog && (
        <ConfirmDialog
          title="Tài khoản bị khóa"
          onCancel={handleLockConfirm}
          onConfirm={handleLockConfirm}
        >
          Tài khoản của bạn đã bị khóa tạm thời trong 15 phút do hủy liên tiếp 5 đơn hàng. Bạn sẽ bị đăng xuất khỏi hệ thống.
        </ConfirmDialog>
      )}
    </section>
  );
}
