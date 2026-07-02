import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { bookService } from '../../services/bookService';
import { cartService } from '../../services/cartService';
import { notifyCartUpdated } from '../../utils/cartEvents';
import OrderTimeline from '../../components/orders/OrderTimeline';
import { LoadingState, ErrorState } from '../../components/ui/State';
import { orderService } from '../../services/orderService';
import { formatCurrency } from '../../utils/formatters';
import Button from '../../components/ui/Button';

const STATUS_MAP = {
  'PENDING_PAYMENT': { text: 'Chờ thanh toán', class: 'warning' },
  'PAID': { text: 'Đang xử lý', class: 'info' },
  'PROCESSING': { text: 'Đang xử lý', class: 'info' },
  'SHIPPED': { text: 'Đang vận chuyển', class: 'info' },
  'DELIVERED': { text: 'Giao hàng thành công', class: 'success' },
  'CANCELLED': { text: 'Đã huỷ', class: 'error' },
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [rebuyingItemIds, setRebuyingItemIds] = useState({});

  useEffect(() => {
    orderService.getOrderById(id)
      .then(async (ord) => {
        if (!ord) return;
        
        // Fetch book cover images in parallel
        const itemsWithCovers = await Promise.all(
          (ord.items || []).map(async (item) => {
            try {
              const book = await bookService.getBookById(item.bookId);
              return {
                ...item,
                coverUrl: book?.coverUrl,
              };
            } catch (err) {
              console.error(`Failed to load cover for book #${item.bookId}:`, err);
              return item;
            }
          })
        );
        
        setOrder({
          ...ord,
          items: itemsWithCovers,
        });
      })
      .catch(err => {
        console.error('Failed to load order detail:', err);
        setError('Không thể tải chi tiết đơn hàng. Vui lòng thử lại sau.');
      });
  }, [id]);

  if (error) {
    return (
      <section className="stack">
        <ErrorState text={error}>
          <Link to="/orders"><Button>Quay lại danh sách</Button></Link>
        </ErrorState>
      </section>
    );
  }

  if (!order) return <LoadingState text="Đang tải chi tiết đơn hàng..." />;

  const address = typeof order.addressSnapshot === 'string'
    ? JSON.parse(order.addressSnapshot)
    : order.addressSnapshot || {};

  const subtotal = (order.items || []).reduce((sum, item) => sum + (item.lineTotal || 0), 0);
  const shippingFee = order.shippingFee || 0;
  // Calculate discount based on subtotal + shippingFee - order.total
  const discount = Math.max(0, subtotal + shippingFee - order.total);

  const statusConfig = STATUS_MAP[order.status] || { text: order.status, class: 'info' };

  const handleRebuyItem = async (bookId, title) => {
    setRebuyingItemIds(prev => ({ ...prev, [bookId]: true }));
    try {
      const newCart = await cartService.addItem({ id: bookId }, 1);
      notifyCartUpdated(newCart);
      navigate('/cart');
    } catch (err) {
      console.error('Failed to rebuy item:', err);
      alert(`Không thể mua lại sách "${title}". Vui lòng thử lại.`);
    } finally {
      setRebuyingItemIds(prev => ({ ...prev, [bookId]: false }));
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getExpectedDeliveryDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    date.setDate(date.getDate() + 3);
    const weekday = date.toLocaleDateString('vi-VN', { weekday: 'long' });
    const dateNum = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${dateNum}`;
  };

  const expectedDateText = getExpectedDeliveryDate(order.createdAt);

  return (
    <section className="stack" style={{ gap: '16px' }}>
      {/* Title Header */}
      <div className="order-detail-header">
        <h1>
          Chi tiết đơn hàng #{order.id} - <span className={`highlight ${statusConfig.class}`}>{statusConfig.text}</span>
        </h1>
        <div className="order-detail-date">Ngày đặt hàng: {formatDate(order.createdAt)}</div>
      </div>

      {/* Info Grid */}
      <div className="order-detail-info-grid">
        {/* Col 1: Địa chỉ người nhận */}
        <div className="order-detail-info-card">
          <h3>Địa chỉ người nhận</h3>
          <div className="card-content">
            <strong>{address.recipient || 'N/A'}</strong>
            <p>Địa chỉ: {[address.line, address.ward, address.district, address.city].filter(Boolean).join(', ') || 'N/A'}</p>
            <p style={{ marginTop: '8px' }}>Điện thoại: {address.phone || 'N/A'}</p>
          </div>
        </div>

        {/* Col 2: Hình thức giao hàng */}
        <div className="order-detail-info-card">
          <h3>Hình thức giao hàng</h3>
          <div className="card-content">
            <strong><span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>FAST</span> Giao hàng Tiêu chuẩn</strong>
            <p style={{ margin: '6px 0' }}>Dự kiến giao vào {expectedDateText}</p>
            <p style={{ fontSize: '12px', color: 'var(--muted)' }}>
              {order.status === 'SHIPPED' || order.status === 'DELIVERED' 
                ? 'Được giao bởi Giao Hàng Tiết Kiệm (GHTK)' 
                : 'Được giao bởi BookVerse Logistics'}
            </p>
            <p style={{ marginTop: '8px', fontWeight: '500' }}>
              {shippingFee === 0 ? 'Miễn phí vận chuyển' : `Phí vận chuyển: ${formatCurrency(shippingFee)}`}
            </p>
          </div>
        </div>

        {/* Col 3: Hình thức thanh toán */}
        <div className="order-detail-info-card">
          <h3>Hình thức thanh toán</h3>
          <div className="card-content">
            <p>Thanh toán qua cổng VNPay</p>
            <p style={{ marginTop: '10px' }} className={`highlight ${statusConfig.class}`}>
              {order.status === 'PENDING_PAYMENT' ? 'Chờ thanh toán.' : order.status === 'CANCELLED' ? 'Đơn hàng đã huỷ.' : 'Thanh toán thành công.'}
            </p>
          </div>
        </div>
      </div>

      {/* Product Items Table */}
      <div className="order-detail-table-wrapper">
        <table className="order-detail-table">
          <thead>
            <tr>
              <th style={{ width: '45%' }}>Sản phẩm</th>
              <th style={{ width: '15%' }}>Giá</th>
              <th style={{ width: '10%' }}>Số lượng</th>
              <th style={{ width: '15%' }}>Giảm giá</th>
              <th style={{ width: '15%', textAlign: 'right' }}>Tạm tính</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, idx) => (
              <tr key={`item-${idx}`}>
                <td>
                  <div className="order-detail-item-cell">
                    <div className="order-detail-item-cover-wrapper">
                      <img 
                        src={item.coverUrl || `https://placehold.co/120x170?text=${encodeURIComponent(item.title || 'Book')}`} 
                        alt={item.title} 
                        className="order-detail-item-cover"
                        onError={(e) => {
                          e.target.src = `https://placehold.co/120x170?text=${encodeURIComponent(item.title || 'Book')}`;
                        }}
                      />
                    </div>
                    <div className="order-detail-item-info">
                      <h4 className="order-detail-item-title">{item.title}</h4>
                      <span className="order-detail-item-meta">Sku: 395962609{item.bookId || 'N/A'}</span>
                      <div className="order-detail-item-actions">
                        <Link to="/books/chat" className="btn-action">Chat với AI</Link>
                        <Link to={`/books/${item.bookId}`} className="btn-action">Viết nhận xét</Link>
                        <button 
                          type="button" 
                          className="btn-action"
                          disabled={rebuyingItemIds[item.bookId]}
                          onClick={() => handleRebuyItem(item.bookId, item.title)}
                        >
                          {rebuyingItemIds[item.bookId] ? 'Đang thêm...' : 'Mua lại'}
                        </button>
                      </div>
                    </div>
                  </div>
                </td>
                <td>{formatCurrency(item.price || (item.lineTotal / item.quantity) || 0)}</td>
                <td>{item.quantity}</td>
                <td>0 VND</td>
                <td style={{ textAlign: 'right', fontWeight: '600' }}>{formatCurrency(item.lineTotal || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary block */}
        <div className="order-detail-summary-section">
          <div className="order-detail-summary-box">
            <div className="order-detail-summary-row">
              <span>Tạm tính</span>
              <strong>{formatCurrency(subtotal)}</strong>
            </div>
            <div className="order-detail-summary-row">
              <span>Phí vận chuyển</span>
              <strong>{formatCurrency(shippingFee)}</strong>
            </div>
            {shippingFee > 0 && (
              <div className="order-detail-summary-row">
                <span>Giảm giá vận chuyển</span>
                <strong style={{ color: 'var(--success)' }}>0 VND</strong>
              </div>
            )}
            {discount > 0 && (
              <div className="order-detail-summary-row">
                <span>Giảm giá</span>
                <strong style={{ color: 'var(--success)' }}>-{formatCurrency(discount)}</strong>
              </div>
            )}
            <div className="order-detail-summary-row total">
              <strong>Tổng cộng</strong>
              <span className="order-detail-total-price">{formatCurrency(order.total || 0)}</span>
            </div>
            <a href="#" onClick={(e) => { e.preventDefault(); window.print(); }} className="order-detail-invoice-link">Xem hóa đơn</a>
          </div>
        </div>
      </div>

      {/* Footer controls */}
      <div className="order-detail-footer-actions">
        <Link to="/orders" className="order-detail-back-link">
          &lt;&lt; Quay lại đơn hàng của tôi
        </Link>
        <button 
          type="button"
          onClick={() => setShowTimeline(!showTimeline)}
          style={{ padding: '10px 20px', borderRadius: 'var(--radius-sm)', fontSize: '14px', background: '#ffd814', color: '#111', border: '1px solid #fcd200', fontWeight: '500', cursor: 'pointer' }}
        >
          {showTimeline ? 'Ẩn lịch trình' : 'Theo dõi đơn hàng'}
        </button>
      </div>

      {/* Order Timeline (Track Order history) */}
      {showTimeline && (
        <div className="order-detail-timeline-panel">
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 'bold' }}>Lịch trình đơn hàng</h3>
          <OrderTimeline history={order.statusHistory || []} />
        </div>
      )}
    </section>
  );
}
