import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingBag } from 'lucide-react';
import Button from '../../components/ui/Button';
import { ErrorState, LoadingState } from '../../components/ui/State';
import { orderService } from '../../services/orderService';
import { bookService } from '../../services/bookService';
import { cartService } from '../../services/cartService';
import { notifyCartUpdated } from '../../utils/cartEvents';
import { formatCurrency } from '../../utils/formatters';

const STATUS_MAP = {
  'PENDING_PAYMENT': { text: 'Chờ thanh toán', class: 'pending-payment' },
  'PAID': { text: 'Đang xử lý', class: 'processing' },
  'PROCESSING': { text: 'Đang xử lý', class: 'processing' },
  'SHIPPED': { text: 'Đang vận chuyển', class: 'shipping' },
  'DELIVERED': { text: 'Đã giao', class: 'delivered' },
  'CANCELLED': { text: 'Đã huỷ', class: 'cancelled' },
};

const TABS = [
  { id: 'ALL', label: 'Tất cả đơn' },
  { id: 'PENDING_PAYMENT', label: 'Chờ thanh toán' },
  { id: 'PROCESSING', label: 'Đang xử lý' },
  { id: 'SHIPPED', label: 'Đang vận chuyển' },
  { id: 'DELIVERED', label: 'Đã giao' },
  { id: 'CANCELLED', label: 'Đã huỷ' },
];

export default function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [rebuyingId, setRebuyingId] = useState(null);

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await orderService.getOrders();
      const rawOrders = Array.isArray(res) ? res : (res?.items || []);
      
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
      setError('Không thể tải danh sách đơn hàng. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleRebuy = async (order) => {
    if (rebuyingId) return;
    setRebuyingId(order.id);
    try {
      let lastCart = null;
      for (const item of order.items) {
        if (item.bookId) {
          lastCart = await cartService.addItem({ id: item.bookId }, item.quantity);
        }
      }
      if (lastCart) {
        notifyCartUpdated(lastCart);
      }
      navigate('/cart');
    } catch (err) {
      console.error('Failed to rebuy order items:', err);
      alert('Không thể mua lại đơn hàng này. Vui lòng thử lại.');
    } finally {
      setRebuyingId(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getBookCover = (item) => {
    return item.coverUrl || item.bookCoverUrl || `https://placehold.co/120x170?text=${encodeURIComponent(item.title || 'Book')}`;
  };

  // Filter orders based on active tab and applied search keyword
  const filteredOrders = orders.filter((order) => {
    // 1. Status Filter
    if (activeTab !== 'ALL') {
      if (activeTab === 'PROCESSING') {
        // Map PAID and PROCESSING to "Đang xử lý"
        if (order.status !== 'PAID' && order.status !== 'PROCESSING') return false;
      } else {
        if (order.status !== activeTab) return false;
      }
    }

    // 2. Search Keyword Filter
    if (appliedSearch.trim() !== '') {
      const keyword = appliedSearch.toLowerCase().trim();
      const matchId = String(order.id).toLowerCase().includes(keyword);
      const matchItems = (order.items || []).some((item) =>
        String(item.title || '').toLowerCase().includes(keyword)
      );
      // Wait, what about "Nhà bán" (Seller)? If there is a seller, we can match it here.
      // Since it's a single storefront bookshop, we'll search by order id and book titles.
      if (!matchId && !matchItems) return false;
    }

    return true;
  });

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setAppliedSearch(searchQuery);
  };

  return (
    <section className="stack">
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text)', margin: '0' }}>
        Đơn hàng của tôi
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
          placeholder="Tìm đơn hàng theo Mã đơn hàng, Nhà bán hoặc Tên sản phẩm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="orders-search-divider" />
        <button type="submit" className="orders-search-btn">
          Tìm đơn hàng
        </button>
      </form>

      {/* Main Content Area */}
      {loading ? (
        <LoadingState text="Đang tải danh sách đơn hàng..." />
      ) : error ? (
        <ErrorState text={error}>
          <Button onClick={loadOrders}>Thử lại</Button>
        </ErrorState>
      ) : filteredOrders.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', background: 'var(--surface)', borderRadius: 'var(--radius-md)', color: 'var(--muted)', marginTop: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <ShoppingBag size={48} style={{ color: 'var(--brand-light)', marginBottom: '16px' }} />
          <p style={{ fontSize: '1.1rem', marginBottom: '8px', color: 'var(--text)', fontWeight: 'bold' }}>
            {appliedSearch ? 'Không tìm thấy đơn hàng phù hợp' : 'Chưa có đơn hàng nào'}
          </p>
          <p style={{ fontSize: '0.9rem', marginBottom: '20px' }}>
            {appliedSearch ? 'Vui lòng thử tìm kiếm bằng từ khoá khác.' : 'Bạn chưa thực hiện bất kỳ giao dịch nào.'}
          </p>
          <Link to="/"><Button>Tiếp tục mua sắm</Button></Link>
        </div>
      ) : (
        <div className="order-cards-list">
          {filteredOrders.map((order) => {
            const statusConfig = STATUS_MAP[order.status] || { text: order.status, class: 'unknown' };
            const isRebuying = rebuyingId === order.id;

            return (
              <div key={order.id} className="order-card">
                {/* Header: Order ID, Date & Status */}
                <div className="order-card-header">
                  <div className="order-card-info">
                    <span className="order-card-id">Đơn hàng: #{order.id}</span>
                    <span className="order-card-date">Ngày đặt: {formatDate(order.createdAt)}</span>
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
                      <span>Thành tiền:</span>
                      <span className="order-card-total-price">
                        {formatCurrency(order.total || 0)}
                      </span>
                    </div>
                    <div className="order-card-actions">
                      <Link to={`/orders/${order.id}`} className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '13px', fontWeight: '500', transition: 'all 0.2s' }}>
                        Xem chi tiết
                      </Link>
                      {/* Only allow Rebuying if status is completed, processing or shipped */}
                      {order.status !== 'PENDING_PAYMENT' && (
                        <Button
                          loading={isRebuying}
                          disabled={isRebuying}
                          onClick={() => handleRebuy(order)}
                          style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', fontSize: '13px' }}
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
      )}
    </section>
  );
}

