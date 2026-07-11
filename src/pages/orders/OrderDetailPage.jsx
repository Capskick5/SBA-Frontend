import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { bookService } from '../../services/bookService';
import { cartService } from '../../services/cartService';
import { notifyCartUpdated } from '../../utils/cartEvents';
import OrderTimeline from '../../components/orders/OrderTimeline';
import { LoadingState, ErrorState } from '../../components/ui/State';
import { orderService } from '../../services/orderService';
import { formatCurrency } from '../../utils/formatters';
import { formatPaymentTimeLeft } from '../../utils/paymentExpiry';
import { showToast } from '../../utils/toast';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

const STATUS_MAP = {
  'PENDING_PAYMENT': { text: 'Pending payment', class: 'warning' },
  'PAID': { text: 'Processing', class: 'info' },
  'PROCESSING': { text: 'Processing', class: 'info' },
  'SHIPPED': { text: 'Shipping', class: 'info' },
  'DELIVERED': { text: 'Delivered', class: 'success' },
  'CANCELLED': { text: 'Cancelled', class: 'error' },
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [rebuyingItemIds, setRebuyingItemIds] = useState({});
  const [now, setNow] = useState(() => Date.now());
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [resuming, setResuming] = useState(false);

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
        setError('Could not load order details. Please try again later.');
      });
  }, [id]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (error) {
    return (
      <section className="stack">
        <ErrorState text={error}>
          <Link to="/orders"><Button>Back to orders</Button></Link>
        </ErrorState>
      </section>
    );
  }

  if (!order) return <LoadingState text="Loading order details..." />;

  const address = typeof order.addressSnapshot === 'string'
    ? JSON.parse(order.addressSnapshot)
    : order.addressSnapshot || {};
  const subtotal = (order.items || []).reduce((sum, item) => sum + (item.lineTotal || 0), 0);
      const shippingFee = order.shippingFee || 0;
      // Calculate discount based on subtotal + shippingFee - order.total
      const discount = Math.max(0, subtotal + shippingFee - order.total);


      const statusConfig = STATUS_MAP[order.status] || {text: order.status, class: 'info' };

  const handleRebuyItem = async (bookId, title) => {
        setRebuyingItemIds(prev => ({ ...prev, [bookId]: true }));
      try {
      const newCart = await cartService.addItem({id: bookId }, 1);
      notifyCartUpdated(newCart);
      navigate('/cart');
    } catch (err) {
        console.error('Failed to rebuy item:', err);
      alert(`Could not buy "${title}" again. Please try again.`);
    } finally {
        setRebuyingItemIds(prev => ({ ...prev, [bookId]: false }));
    }
  };

  const handleCancelPendingOrder = async () => {
    if (cancelling) return;

    setCancelling(true);
    try {
      const cancelledOrder = await orderService.cancelPendingOrder(order.id);
      setOrder((current) => ({ ...current, ...cancelledOrder }));
      setShowCancelConfirm(false);
      showToast(`Order #${cancelledOrder.id} was cancelled.`, 'success');
    } catch (err) {
      showToast(err?.message || 'Could not cancel this order. Please try again.', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const handleContinuePayment = async () => {
    if (resuming) return;

    setResuming(true);
    try {
      const paymentLink = await orderService.getPendingPaymentLink(order.id);
      window.location.assign(paymentLink.checkoutUrl);
    } catch (err) {
      showToast(err?.message || 'Could not continue this payment. Please try again.', 'error');
      setResuming(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-GB', {
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
      const weekday = date.toLocaleDateString('en-GB', {weekday: 'long' });
      const dateNum = date.toLocaleDateString('en-GB', {day: '2-digit', month: '2-digit' });
      return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${dateNum}`;
  };

      const expectedDateText = getExpectedDeliveryDate(order.createdAt);

      return (
      <section className="stack" style={{ gap: '16px' }}>
        {/* Title Header */}
        <div className="order-detail-header">
          <h1>
            Order #{order.id} - <span className={`highlight ${statusConfig.class}`}>{statusConfig.text}</span>
          </h1>
          <div className="order-detail-date">Placed on {formatDate(order.createdAt)}</div>
        </div>

        {/* Info Grid */}
        <div className="order-detail-info-grid">
          {/* Col 1: Recipient address */}
          <div className="order-detail-info-card">
            <h3>Recipient address</h3>
            <div className="card-content">
              <strong>{address.recipient || 'N/A'}</strong>
              <p>Address: {[address.line, address.ward, address.district, address.city].filter(Boolean).join(', ') || 'N/A'}</p>
              <p style={{ marginTop: '8px' }}>Phone: {address.phone || 'N/A'}</p>
            </div>
          </div>

          {/* Col 2: Delivery method */}
          <div className="order-detail-info-card">
            <h3>Delivery method</h3>
            <div className="card-content">
              <strong><span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>FAST</span> Standard Delivery</strong>
              <p style={{ margin: '6px 0' }}>Estimated delivery on {expectedDateText}</p>
              <p style={{ fontSize: '12px', color: 'var(--muted)' }}>
                {order.status === 'SHIPPED' || order.status === 'DELIVERED'
                  ? 'Delivered by GHTK'
                  : 'Delivered by BookVerse Logistics'}
              </p>
              <p style={{ marginTop: '8px', fontWeight: '500' }}>
                {shippingFee === 0 ? 'Free shipping' : `Shipping fee: ${formatCurrency(shippingFee)}`}
              </p>
            </div>
          </div>

          {/* Col 3: Payment method */}
          <div className="order-detail-info-card">
            <h3>Payment method</h3>
            <div className="card-content">
              <p>Payment through VNPay</p>
              <p style={{ marginTop: '10px' }} className={`highlight ${statusConfig.class}`}>
                {order.status === 'PENDING_PAYMENT' ? 'Waiting for payment.' : order.status === 'CANCELLED' ? 'This order has been cancelled.' : 'Payment completed.'}
              </p>
              {order.status === 'PENDING_PAYMENT' && (
                <div className="order-detail-pending-payment">
                  <strong>{formatPaymentTimeLeft(order.expiresAt, now)}</strong>
                  <Button
                    type="button"
                    loading={resuming}
                    disabled={cancelling}
                    onClick={handleContinuePayment}
                  >
                    Continue payment
                  </Button>
                  <Button
                    type="button"
                    className="pending-payment-cancel"
                    disabled={resuming || cancelling}
                    onClick={() => setShowCancelConfirm(true)}
                  >
                    Cancel order
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Product Items Table */}
        <div className="order-detail-table-wrapper">
          <table className="order-detail-table">
            <thead>
              <tr>
                <th style={{ width: '45%' }}>Product</th>
                <th style={{ width: '15%' }}>Price</th>
                <th style={{ width: '10%' }}>Quantity</th>
                <th style={{ width: '15%' }}>Discount</th>
                <th style={{ width: '15%', textAlign: 'right' }}>Subtotal</th>
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
                          <Link to="/books/chat" className="btn-action">Chat with AI</Link>
                          <Link to={`/books/${item.bookId}`} className="btn-action">Write a review</Link>
                          <button
                            type="button"
                            className="btn-action"
                            disabled={rebuyingItemIds[item.bookId]}
                            onClick={() => handleRebuyItem(item.bookId, item.title)}
                          >
                            {rebuyingItemIds[item.bookId] ? 'Adding...' : 'Buy again'}
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
                <span>Subtotal</span>
                <strong>{formatCurrency(subtotal)}</strong>
              </div>
              <div className="order-detail-summary-row">
                <span>Shipping fee</span>
                <strong>{formatCurrency(shippingFee)}</strong>
              </div>
              {shippingFee > 0 && (
                <div className="order-detail-summary-row">
                  <span>Shipping discount</span>
                  <strong style={{ color: 'var(--success)' }}>0 VND</strong>
                </div>
              )}
              {discount > 0 && (
                <div className="order-detail-summary-row">
                  <span>Discount</span>
                  <strong style={{ color: 'var(--success)' }}>-{formatCurrency(discount)}</strong>
                </div>
              )}
              <div className="order-detail-summary-row total">
                <strong>Total</strong>
                <span className="order-detail-total-price">{formatCurrency(order.total || 0)}</span>
              </div>
              <a href="#" onClick={(e) => { e.preventDefault(); window.print(); }} className="order-detail-invoice-link">View invoice</a>
            </div>
          </div>
        </div>

        {/* Footer controls */}
        <div className="order-detail-footer-actions">
          <Link to="/orders" className="order-detail-back-link">
            &lt;&lt; Back to my orders
          </Link>
          <button
            type="button"
            onClick={() => setShowTimeline(!showTimeline)}
            style={{ padding: '10px 20px', borderRadius: 'var(--radius-sm)', fontSize: '14px', background: '#ffd814', color: '#111', border: '1px solid #fcd200', fontWeight: '500', cursor: 'pointer' }}
          >
            {showTimeline ? 'Hide timeline' : 'Track order'}
          </button>
        </div>

        {/* Order Timeline (Track Order history) */}
        {showTimeline && (
          <div className="order-detail-timeline-panel">
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 'bold' }}>Order timeline</h3>
            <OrderTimeline history={order.statusHistory || []} />
          </div>
        )}

        {showCancelConfirm && (
          <ConfirmDialog
            title="Cancel pending order?"
            onCancel={() => {
              if (!cancelling) setShowCancelConfirm(false);
            }}
            onConfirm={handleCancelPendingOrder}
          >
            Order #{order.id} will be cancelled and its reserved stock will be released. This action cannot be undone.
          </ConfirmDialog>
        )}
      </section>
      );
}
