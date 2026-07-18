import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingBag } from 'lucide-react';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Pagination from '../../components/catalog/Pagination';
import { ErrorState, LoadingState } from '../../components/ui/State';
import { orderService } from '../../services/orderService';
import { bookService } from '../../services/bookService';
import { cartFacade } from '../../services/cartFacade';
import { notifyCartUpdated } from '../../utils/cartEvents';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { formatPaymentTimeLeft } from '../../utils/paymentExpiry';
import { showToast } from '../../utils/toast';
import {
  clearPendingPaymentCache,
  getPendingPaymentUserMessage,
} from '../../utils/pendingOrderGuard';

const STATUS_MAP = {
  'PENDING_PAYMENT': { text: 'Pending payment', class: 'pending-payment' },
  'PAID': { text: 'Processing', class: 'processing' },
  'PROCESSING': { text: 'Processing', class: 'processing' },
  'SHIPPED': { text: 'Shipping', class: 'shipping' },
  'DELIVERED': { text: 'Delivered', class: 'delivered' },
  'CANCELLED': { text: 'Cancelled', class: 'cancelled' },
};

const TABS = [
  { id: 'ALL', label: 'All orders' },
  { id: 'PENDING_PAYMENT', label: 'Pending payment' },
  { id: 'PROCESSING', label: 'Processing' },
  { id: 'SHIPPED', label: 'Shipping' },
  { id: 'DELIVERED', label: 'Delivered' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

const PAGE_SIZE = 10;

export default function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [rebuyingId, setRebuyingId] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [resumingId, setResumingId] = useState(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filter = activeTab === 'ALL'
        ? {}
        : activeTab === 'PROCESSING'
          ? { statuses: ['PAID', 'PROCESSING'] }
          : { status: activeTab };
      const result = await orderService.getOrdersPage({
        page,
        size: PAGE_SIZE,
        search: appliedSearch,
        ...filter,
      });
      const rawOrders = result.items;
      setTotalPages(result.totalPages);
      setTotalItems(result.totalItems);
      
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

      // Fetch details in parallel to obtain the line items (books inside the order)
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

            return {
              ...order,
              items: itemsWithCovers,
              addressSnapshot: details?.addressSnapshot,
              statusHistory: details?.statusHistory,
            };
          } catch (err) {
            console.error(`Failed to load details for order #${order.id}:`, err);
            return { ...order, items: [] };
          }
        })
      );

      // Sort by ID descending (newest first)
      detailedOrders.sort((a, b) => b.id - a.id);
      setOrders(detailedOrders);
    } catch (err) {
      console.error('Failed to load orders:', err);
      setError('Could not load your orders. Please try again later.');
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
        getPendingPaymentUserMessage(err) || 'Could not buy this order again. Please try again.',
        'error',
      );
    } finally {
      setRebuyingId(null);
    }
  };

  const getBookCover = (item) => {
    return item.coverUrl || item.bookCoverUrl || `https://placehold.co/120x170?text=${encodeURIComponent(item.title || 'Book')}`;
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(0);
    setAppliedSearch(searchQuery.trim());
  };

  const handleCancelPendingOrder = async () => {
    if (!cancelTarget || cancellingId) return;

    setCancellingId(cancelTarget.id);
    try {
      const cancelledOrder = await orderService.cancelPendingOrder(cancelTarget.id);
      clearPendingPaymentCache();
      setCancelTarget(null);
      showToast(`Order #${cancelledOrder.id} was cancelled.`, 'success');
      if (orders.length === 1 && page > 0) {
        setPage((current) => current - 1);
      } else {
        await loadOrders();
      }
    } catch (err) {
      showToast(err?.message || 'Could not cancel this order. Please try again.', 'error');
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
      showToast(err?.message || 'Could not continue this payment. Please try again.', 'error');
      await loadOrders();
      setResumingId(null);
    }
  };

  return (
    <section className="stack">
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text)', margin: '0' }}>
        My Orders
      </h1>

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
          placeholder="Search all orders by order ID or product name"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="orders-search-divider" />
        <button type="submit" className="orders-search-btn">
          Search orders
        </button>
      </form>

      {/* Main Content Area */}
      {loading ? (
        <LoadingState text="Loading orders..." />
      ) : error ? (
        <ErrorState text={error}>
          <Button onClick={loadOrders}>Try again</Button>
        </ErrorState>
      ) : orders.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', background: 'var(--surface)', borderRadius: 'var(--radius-md)', color: 'var(--muted)', marginTop: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <ShoppingBag size={48} style={{ color: 'var(--brand-light)', marginBottom: '16px' }} />
          <p style={{ fontSize: '1.1rem', marginBottom: '8px', color: 'var(--text)', fontWeight: 'bold' }}>
            {appliedSearch ? 'No matching orders found' : 'No orders yet'}
          </p>
          <p style={{ fontSize: '0.9rem', marginBottom: '20px' }}>
            {appliedSearch ? 'Try another keyword.' : 'You have not placed any orders yet.'}
          </p>
          <Link to="/"><Button>Continue shopping</Button></Link>
        </div>
      ) : (
        <>
          <div className="orders-page-count">Showing {orders.length} of {totalItems} orders</div>
          <div className="order-cards-list">
            {orders.map((order) => {
            const statusConfig = STATUS_MAP[order.status] || { text: order.status, class: 'unknown' };
            const isRebuying = rebuyingId === order.id;

            return (
              <div key={order.id} className="order-card">
                {/* Header: Order ID, Date & Status */}
                <div className="order-card-header">
                  <div className="order-card-info">
                    <span className="order-card-id">Order #{order.id}</span>
                    <span className="order-card-date">Placed on {formatDateTime(order.createdAt)}</span>
                    {order.deliveryType === 'GIFT' && (
                      <span className="order-card-gift-badge">Gift order · Wrapped</span>
                    )}
                  </div>
                  <span className={`status-badge ${statusConfig.class}`}>
                    {statusConfig.text}
                  </span>
                </div>

                {/* Body: Product List */}
                <div className="order-card-body">
                  {order.items.map((item, idx) => (
                    <div key={`${order.id}-item-${idx}`} className="order-item-row">
                      <div className="order-item-cover-wrapper">
                        <img
                          src={getBookCover(item)}
                          alt={item.title || 'Book Cover'}
                          className="order-item-cover"
                          onError={(e) => {
                            e.target.src = `https://placehold.co/120x170?text=${encodeURIComponent(item.title || 'Book')}`;
                          }}
                        />
                      </div>
                      <div className="order-item-details">
                        <h4 className="order-item-title">{item.title}</h4>
                        <span className="order-item-qty">Quantity: x{item.quantity}</span>
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
                      <span>In transit | Carrier: GHTK</span>
                    )}
                  </div>
                  <div className="order-card-summary">
                    <div className="order-card-total-row">
                      <span>Total:</span>
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
                            Continue payment
                          </Button>
                          <Button
                            type="button"
                            className="pending-payment-cancel"
                            disabled={Boolean(cancellingId) || Boolean(resumingId)}
                            onClick={() => setCancelTarget(order)}
                          >
                            Cancel order
                          </Button>
                        </div>
                      )}
                      <Link to={`/orders/${order.id}`} className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '13px', fontWeight: '500', transition: 'all 0.2s' }}>
                        View details
                      </Link>
                      {/* Only allow Rebuying if status is completed, processing or shipped */}
                      {order.status !== 'PENDING_PAYMENT' && (
                        <Button
                          loading={isRebuying}
                          disabled={isRebuying}
                          onClick={() => handleRebuy(order)}
                          style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', fontSize: '13px' }}
                        >
                          Buy again
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

      {cancelTarget && (
        <ConfirmDialog
          title="Cancel pending order?"
          onCancel={() => {
            if (!cancellingId) setCancelTarget(null);
          }}
          onConfirm={handleCancelPendingOrder}
        >
          Order #{cancelTarget.id} will be cancelled and its reserved stock will be released. This action cannot be undone.
        </ConfirmDialog>
      )}
    </section>
  );
}
