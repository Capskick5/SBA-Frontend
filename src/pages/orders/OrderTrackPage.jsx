import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { orderService } from '../../services/orderService';
import { bookService } from '../../services/bookService';
import Button from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/State';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

const STATUS_MAP = {
  PENDING_PAYMENT: { text: 'Pending payment', class: 'warning' },
  PAID: { text: 'Processing', class: 'info' },
  PROCESSING: { text: 'Processing', class: 'info' },
  PACKED: { text: 'Packed', class: 'info' },
  SHIPPED: { text: 'Shipping', class: 'info' },
  DELIVERED: { text: 'Delivered', class: 'success' },
  CANCELLED: { text: 'Cancelled', class: 'error' },
  PAYMENT_FAILED: { text: 'Payment failed', class: 'error' },
};

// Milestones for the tracking progress bar, in order.
const MILESTONES = [
  { key: 'placed', label: 'Order placed' },
  { key: 'paid', label: 'Payment confirmed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
];

function buildTimeline(order) {
  const stamps = {
    placed: order.createdAt,
    paid: order.paidAt,
    shipped: order.shippedAt,
    delivered: order.deliveredAt,
  };
  return MILESTONES.map((m) => ({
    ...m,
    at: stamps[m.key],
    done: Boolean(stamps[m.key]),
  }));
}

export default function OrderTrackPage() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code') || '';
  const token = searchParams.get('token') || '';

  const [email, setEmail] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const result = await orderService.trackGuestOrder({ email, code, token });
      const itemsWithCovers = await Promise.all(
        (result.items || []).map(async (item) => {
          try {
            const book = await bookService.getBookById(item.bookId);
            return { ...item, coverUrl: book?.coverUrl };
          } catch {
            return item;
          }
        }),
      );
      setOrder({ ...result, items: itemsWithCovers });
    } catch {
      setOrder(null);
      setError(
        'We could not find an order matching that email. Please double-check the email you used at checkout, and make sure you opened the link from your confirmation email.',
      );
    } finally {
      setLoading(false);
    }
  };

  const hasLink = code && token;

  return (
    <section className="stack" style={{ gap: '24px', maxWidth: '960px', margin: '0 auto' }}>
      <div
        style={{
          background: 'linear-gradient(135deg, var(--brand-primary), var(--accent))',
          color: '#fff',
          borderRadius: 'var(--radius-lg, 16px)',
          padding: '28px 32px',
        }}
      >
        <h1 style={{ margin: 0, color: '#fff' }}>Track your order</h1>
        <p style={{ margin: '8px 0 0', opacity: 0.9 }}>
          Enter the email you used at checkout to see the latest status of your BookVerse order.
        </p>
        {code && (
          <p style={{ margin: '12px 0 0', fontWeight: 600 }}>
            Order code: <span style={{ letterSpacing: '1px' }}>{code}</span>
          </p>
        )}
      </div>

      {!hasLink && (
        <div className="order-detail-info-card">
          <div className="card-content">
            <p>
              This tracking link looks incomplete. Please open the “Track My Order” link from your
              confirmation email, or contact us if the problem continues.
            </p>
          </div>
        </div>
      )}

      {hasLink && (
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'flex-end',
            background: 'var(--surface, #fff)',
            border: '1px solid var(--border, #eee)',
            borderRadius: 'var(--radius-md, 12px)',
            padding: '20px',
            boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.06))',
          }}
        >
          <label style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontWeight: 600 }}>Email used at checkout</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm, 8px)',
                border: '1px solid var(--border, #ddd)',
                fontSize: '15px',
              }}
            />
          </label>
          <Button type="submit" loading={loading} disabled={!email.trim()}>
            Track order
          </Button>
        </form>
      )}

      {error && (
        <div className="order-detail-info-card">
          <div className="card-content">
            <p className="highlight error" style={{ margin: 0 }}>{error}</p>
          </div>
        </div>
      )}

      {loading && <LoadingState text="Looking up your order..." />}

      {order && !loading && <OrderTrackResult order={order} code={code} />}

      <div>
        <Link to="/" className="order-detail-back-link">&lt;&lt; Back to home</Link>
      </div>
    </section>
  );
}

function OrderTrackResult({ order, code }) {
  const statusConfig = STATUS_MAP[order.status] || { text: order.status, class: 'info' };
  const address =
    typeof order.addressSnapshot === 'string'
      ? safeParse(order.addressSnapshot)
      : order.addressSnapshot || {};
  const timeline = buildTimeline(order);
  const cancelled = order.status === 'CANCELLED' || order.status === 'PAYMENT_FAILED';

  const subtotal = order.subtotal ?? 0;
  const shippingFee = order.shippingFee || 0;
  const giftWrapFee = order.giftWrapFee || 0;
  const discount =
    order.discountAmount ?? Math.max(0, subtotal + shippingFee + giftWrapFee - (order.total || 0));

  return (
    <div className="stack" style={{ gap: '16px' }}>
      <div className="order-detail-header">
        <h1>
          Order {code} - <span className={`highlight ${statusConfig.class}`}>{statusConfig.text}</span>
        </h1>
        <div className="order-detail-date">Placed on {formatDateTime(order.createdAt)}</div>
      </div>

      {/* Progress timeline */}
      <div className="order-detail-info-card">
        <h3>Delivery progress</h3>
        <div className="card-content">
          {cancelled ? (
            <p className="highlight error" style={{ margin: 0 }}>
              {order.status === 'PAYMENT_FAILED'
                ? 'The payment for this order failed. No package will be shipped.'
                : 'This order was cancelled.'}
            </p>
          ) : (
            <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '14px' }}>
              {timeline.map((step) => (
                <li key={step.key} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span
                    aria-hidden="true"
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      marginTop: '4px',
                      flexShrink: 0,
                      background: step.done ? 'var(--accent)' : 'var(--border, #ddd)',
                      boxShadow: step.done ? '0 0 0 3px var(--brand-light, #fcb1a6)' : 'none',
                    }}
                  />
                  <div>
                    <strong style={{ color: step.done ? 'var(--brand-primary)' : 'var(--muted)' }}>
                      {step.label}
                    </strong>
                    <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                      {step.at ? formatDateTime(step.at) : 'Pending'}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* Info grid */}
      <div className="order-detail-info-grid">
        <div className="order-detail-info-card">
          <h3>Recipient address</h3>
          <div className="card-content">
            <strong>{address.recipient || 'N/A'}</strong>
            <p>
              Address:{' '}
              {[address.line, address.ward, address.district, address.city]
                .filter(Boolean)
                .join(', ') || 'N/A'}
            </p>
            <p style={{ marginTop: '8px' }}>Phone: {address.phone || 'N/A'}</p>
          </div>
        </div>

        <div className="order-detail-info-card">
          <h3>Delivery method</h3>
          <div className="card-content">
            <strong>
              <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>FAST</span> Standard Delivery
            </strong>
            <p style={{ marginTop: '8px', fontWeight: 500 }}>
              {shippingFee === 0 ? 'Free shipping' : `Shipping fee: ${formatCurrency(shippingFee)}`}
            </p>
            {order.deliveryType === 'GIFT' && (
              <p style={{ marginTop: '8px' }}>Gift delivery with wrapping</p>
            )}
            {order.trackingCode && (
              <p style={{ marginTop: '8px', fontSize: '13px', color: 'var(--muted)' }}>
                Carrier tracking: {order.trackingCode}
              </p>
            )}
          </div>
        </div>

        <div className="order-detail-info-card">
          <h3>Payment method</h3>
          <div className="card-content">
            <p>{order.paymentMethod === 'COD' ? 'Cash on delivery' : 'Payment through VNPay'}</p>
            <p style={{ marginTop: '10px' }} className={`highlight ${statusConfig.class}`}>
              {order.status === 'PENDING_PAYMENT'
                ? 'Waiting for payment.'
                : order.status === 'CANCELLED'
                  ? 'This order has been cancelled.'
                  : order.status === 'PAYMENT_FAILED'
                    ? 'Payment failed.'
                    : order.paymentMethod === 'COD'
                      ? 'Pay with cash when your order arrives.'
                      : 'Payment completed.'}
            </p>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="order-detail-table-wrapper">
        <table className="order-detail-table">
          <thead>
            <tr>
              <th style={{ width: '55%' }}>Product</th>
              <th style={{ width: '15%' }}>Price</th>
              <th style={{ width: '10%' }}>Quantity</th>
              <th style={{ width: '20%', textAlign: 'right' }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {(order.items || []).map((item, idx) => (
              <tr key={`item-${idx}`}>
                <td>
                  <div className="order-detail-item-cell">
                    <div className="order-detail-item-cover-wrapper">
                      <img
                        src={
                          item.coverUrl ||
                          `https://placehold.co/120x170?text=${encodeURIComponent(item.title || 'Book')}`
                        }
                        alt={item.title}
                        className="order-detail-item-cover"
                        onError={(e) => {
                          e.target.src = `https://placehold.co/120x170?text=${encodeURIComponent(
                            item.title || 'Book',
                          )}`;
                        }}
                      />
                    </div>
                    <div className="order-detail-item-info">
                      <h4 className="order-detail-item-title">{item.title}</h4>
                    </div>
                  </div>
                </td>
                <td>{formatCurrency(item.unitPrice || 0)}</td>
                <td>{item.quantity}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>
                  {formatCurrency(item.lineTotal || 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

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
            {giftWrapFee > 0 && (
              <div className="order-detail-summary-row">
                <span>Gift wrap fee</span>
                <strong>{formatCurrency(giftWrapFee)}</strong>
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
          </div>
        </div>
      </div>
    </div>
  );
}

function safeParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
