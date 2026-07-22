import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { orderService } from '../../services/orderService';
import { bookService } from '../../services/bookService';
import Button from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/State';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { getOrderStatusConfig, getPaymentMethodLabel } from '../../utils/orderLabels';

// Milestones for the tracking progress bar, in order.
const MILESTONES = [
  { key: 'placed', label: 'Đã đặt hàng' },
  { key: 'paid', label: 'Đã xác nhận thanh toán' },
  { key: 'shipped', label: 'Đã gửi hàng' },
  { key: 'delivered', label: 'Đã giao' },
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
        'Không tìm thấy đơn hàng khớp với email này. Vui lòng kiểm tra lại email bạn dùng khi thanh toán và đảm bảo bạn mở đúng liên kết từ email xác nhận.',
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
        <h1 style={{ margin: 0, color: '#fff' }}>Theo dõi đơn hàng</h1>
        <p style={{ margin: '8px 0 0', opacity: 0.9 }}>
          Nhập email bạn dùng khi thanh toán để xem trạng thái mới nhất của đơn BookVerse.
        </p>
        {code && (
          <p style={{ margin: '12px 0 0', fontWeight: 600 }}>
            Mã đơn: <span style={{ letterSpacing: '1px' }}>{code}</span>
          </p>
        )}
      </div>

      {!hasLink && (
        <div className="order-detail-info-card">
          <div className="card-content">
            <p>
              Liên kết theo dõi không đầy đủ. Vui lòng mở liên kết "Theo dõi đơn hàng" từ email xác nhận, hoặc liên hệ chúng tôi nếu sự cố vẫn tiếp diễn.
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
            <span style={{ fontWeight: 600 }}>Email dùng khi thanh toán</span>
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
            Theo dõi đơn hàng
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

      {loading && <LoadingState text="Đang tra cứu đơn hàng..." />}

      {order && !loading && <OrderTrackResult order={order} code={code} />}

      <div>
        <Link to="/" className="order-detail-back-link">&lt;&lt; Quay lại trang chủ</Link>
      </div>
    </section>
  );
}

function OrderTrackResult({ order, code }) {
  const statusConfig = getOrderStatusConfig(order.status);
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
          Đơn {code} - <span className={`highlight ${statusConfig.class}`}>{statusConfig.text}</span>
        </h1>
        <div className="order-detail-date">Đặt ngày {formatDateTime(order.createdAt)}</div>
      </div>

      {/* Progress timeline */}
      <div className="order-detail-info-card">
        <h3>Tiến trình giao hàng</h3>
        <div className="card-content">
          {cancelled ? (
            <p className="highlight error" style={{ margin: 0 }}>
              {order.status === 'PAYMENT_FAILED'
                ? 'Thanh toán cho đơn hàng này thất bại. Không có kiện hàng nào được gửi.'
                : 'Đơn hàng này đã bị hủy.'}
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
                      {step.at ? formatDateTime(step.at) : 'Chờ xử lý'}
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
          <h3>Địa chỉ người nhận</h3>
          <div className="card-content">
            <strong>{address.recipient || 'Không có'}</strong>
            <p>
              Địa chỉ:{' '}
              {[address.line, address.ward, address.district, address.city]
                .filter(Boolean)
                .join(', ') || 'Không có'}
            </p>
            <p style={{ marginTop: '8px' }}>Điện thoại: {address.phone || 'Không có'}</p>
          </div>
        </div>

        <div className="order-detail-info-card">
          <h3>Phương thức giao hàng</h3>
          <div className="card-content">
            <strong>
              <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>NHANH</span> Giao hàng tiêu chuẩn
            </strong>
            <p style={{ marginTop: '8px', fontWeight: 500 }}>
              {shippingFee === 0 ? 'Miễn phí vận chuyển' : `Phí vận chuyển: ${formatCurrency(shippingFee)}`}
            </p>
            {order.deliveryType === 'GIFT' && (
              <p style={{ marginTop: '8px' }}>Giao quà kèm gói quà</p>
            )}
            {order.trackingCode && (
              <p style={{ marginTop: '8px', fontSize: '13px', color: 'var(--muted)' }}>
                Mã vận đơn: {order.trackingCode}
              </p>
            )}
          </div>
        </div>

        <div className="order-detail-info-card">
          <h3>Phương thức thanh toán</h3>
          <div className="card-content">
            <p>{getPaymentMethodLabel(order.paymentMethod)}</p>
            <p style={{ marginTop: '10px' }} className={`highlight ${statusConfig.class}`}>
              {order.status === 'PENDING_PAYMENT'
                ? 'Đang chờ thanh toán.'
                : order.status === 'CANCELLED'
                  ? 'Đơn hàng này đã bị hủy.'
                  : order.status === 'PAYMENT_FAILED'
                    ? 'Thanh toán thất bại.'
                    : order.paymentMethod === 'COD'
                      ? 'Thanh toán tiền mặt khi nhận hàng.'
                      : 'Đã thanh toán.'}
            </p>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="order-detail-table-wrapper">
        <table className="order-detail-table">
          <thead>
            <tr>
              <th style={{ width: '55%' }}>Sản phẩm</th>
              <th style={{ width: '15%' }}>Giá</th>
              <th style={{ width: '10%' }}>Số lượng</th>
              <th style={{ width: '20%', textAlign: 'right' }}>Tạm tính</th>
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
                          `https://placehold.co/120x170?text=${encodeURIComponent(item.title || 'Sách')}`
                        }
                        alt={item.title}
                        className="order-detail-item-cover"
                        onError={(e) => {
                          e.target.src = `https://placehold.co/120x170?text=${encodeURIComponent(
                            item.title || 'Sách',
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
              <span>Tạm tính</span>
              <strong>{formatCurrency(subtotal)}</strong>
            </div>
            <div className="order-detail-summary-row">
              <span>Phí vận chuyển</span>
              <strong>{formatCurrency(shippingFee)}</strong>
            </div>
            {giftWrapFee > 0 && (
              <div className="order-detail-summary-row">
                <span>Phí gói quà</span>
                <strong>{formatCurrency(giftWrapFee)}</strong>
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
