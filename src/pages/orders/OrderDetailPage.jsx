import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { bookService } from '../../services/bookService';
import { cartFacade } from '../../services/cartFacade';
import { notifyCartUpdated } from '../../utils/cartEvents';
import OrderTimeline from '../../components/orders/OrderTimeline';
import { LoadingState, ErrorState } from '../../components/ui/State';
import { orderService } from '../../services/orderService';
import { refundService } from '../../services/refundService';
import RefundRequestModal from '../../components/orders/RefundRequestModal';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { formatPaymentTimeLeft } from '../../utils/paymentExpiry';
import { showToast } from '../../utils/toast';
import {
  clearPendingPaymentCache,
} from '../../utils/pendingOrderGuard';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { getOrderStatusConfig, getPaymentMethodLabel } from '../../utils/orderLabels';

export default function OrderDetailPage({ adminView = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [rebuyingItemIds, setRebuyingItemIds] = useState({});
  const [now, setNow] = useState(() => Date.now());
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [showLockDialog, setShowLockDialog] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundRequest, setRefundRequest] = useState(null);

  const fetchRefundInfo = async () => {
    if (id) {
      const existing = await refundService.getRefundByOrderId(id);
      setRefundRequest(existing);
    }
  };

  useEffect(() => {
    fetchRefundInfo();
  }, [id]);

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

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (error) {
    return (
      <section className="stack">
        <ErrorState text={error}>
          <Link to={isLoggedIn ? '/orders' : '/'}><Button>Quay lại {isLoggedIn ? 'đơn hàng' : 'trang chủ'}</Button></Link>
        </ErrorState>
      </section>
    );
  }

  if (!order) return <LoadingState text="Đang tải chi tiết đơn hàng..." />;

  const address = typeof order.addressSnapshot === 'string'
    ? JSON.parse(order.addressSnapshot)
    : order.addressSnapshot || {};
  const calculatedSubtotal = (order.items || []).reduce((sum, item) => sum + (item.lineTotal || 0), 0);
  const subtotal = order.subtotal ?? calculatedSubtotal;
  const shippingFee = order.shippingFee || 0;
  const giftWrapFee = order.giftWrapFee || 0;
  const discount = order.discountAmount ?? Math.max(0, subtotal + shippingFee + giftWrapFee - order.total);


  const statusConfig = getOrderStatusConfig(order.status);

  const handleRebuy = async (bookId) => {
    if (rebuyingItemIds[bookId]) return;
    setRebuyingItemIds(prev => ({ ...prev, [bookId]: true }));
    try {
      const book = await bookService.getBook(bookId);
      const updated = await cartFacade.addItem(book, 1);
      notifyCartUpdated(updated);
      showToast('Đã thêm vào giỏ!');
    } catch (err) {
      showToast(
        err?.message || 'Không thể thêm sản phẩm vào giỏ. Vui lòng thử lại.',
        'error'
      );
    } finally {
        setRebuyingItemIds(prev => ({ ...prev, [bookId]: false }));
    }
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
    if (cancelling) return;

    setCancelling(true);
    try {
      const cancelledOrder = await orderService.cancelPendingOrder(order.id);
      clearPendingPaymentCache();
      setOrder((current) => ({ ...current, ...cancelledOrder }));
      setShowCancelConfirm(false);
      showToast(`Đơn hàng #${cancelledOrder.id} đã được hủy.`, 'success');

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
      showToast(err?.message || 'Không thể tiếp tục thanh toán. Vui lòng thử lại.', 'error');
      setResuming(false);
    }
  };

  const getExpectedDeliveryDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    date.setDate(date.getDate() + 3);
    const weekday = date.toLocaleDateString('vi-VN', { weekday: 'long' });
    return `${weekday}, ${formatDate(date)}`;
  };

      const expectedDateText = getExpectedDeliveryDate(order.createdAt);

      return (
      <section className="stack" style={{ gap: '16px' }}>
        {/* Title Header */}
        <div className="order-detail-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <h1>
              Đơn #{order.id} - <span className={`highlight ${statusConfig.class}`}>{statusConfig.text}</span>
            </h1>
            {!adminView && (['DELIVERED', 'PAID', 'PROCESSING', 'SHIPPED'].includes(order.status) || refundRequest) && (
              <div>
                {!refundRequest ? (
                  <Button variant="outline" style={{ borderColor: '#e11d48', color: '#e11d48' }} onClick={() => setShowRefundModal(true)}>
                    Trả hàng / Hoàn tiền
                  </Button>
                ) : (
                  <span className={`status-badge ${refundRequest.status === 'APPROVED' ? 'refunded' : refundRequest.status === 'REJECTED' ? 'cancelled' : 'refund-requested'}`}>
                    Yêu cầu hoàn tiền: {refundRequest.status === 'APPROVED' ? 'ĐÃ CHẤP NHẬN' : refundRequest.status === 'REJECTED' ? 'TỪ CHỐI' : 'ĐANG XEM XÉT'}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="order-detail-date">
            Đặt ngày {formatDateTime(order.createdAt)}
            {adminView && (
              <span>
                {' · '}
                {order.userId
                  ? `Đặt bởi người dùng #${order.userId}`
                  : `Đặt bởi khách${order.guestEmail ? ` (${order.guestEmail})` : ''}`}
              </span>
            )}
          </div>
        </div>

        {/* Refund Status Info Banner */}
        {refundRequest && (
          <div style={{
            padding: '16px',
            borderRadius: '8px',
            background: refundRequest.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.08)' : refundRequest.status === 'REJECTED' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
            border: `1px solid ${refundRequest.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.2)' : refundRequest.status === 'REJECTED' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
          }}>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '15px' }}>
              {refundRequest.status === 'APPROVED' ? '✅ Yêu cầu hoàn tiền đã được chấp nhận' : refundRequest.status === 'REJECTED' ? '❌ Yêu cầu hoàn tiền bị từ chối' : '⏳ Yêu cầu hoàn tiền đang chờ Admin xử lý'}
            </h4>
            <p style={{ margin: '0', fontSize: '13px', color: 'var(--muted)' }}>
              Lý do hoàn: <strong>{refundRequest.reason}</strong> · Tài khoản nhận tiền: <strong>{refundRequest.bankName} - {refundRequest.accountNumber} ({refundRequest.accountOwner})</strong>
            </p>
            {refundRequest.status === 'REJECTED' && refundRequest.rejectReason && (
              <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#ef4444' }}>
                Lý do từ chối từ Admin: {refundRequest.rejectReason}
              </p>
            )}
          </div>
        )}

        {/* Info Grid */}
        <div className="order-detail-info-grid">
          {/* Col 1: Recipient address */}
          <div className="order-detail-info-card">
            <h3>Địa chỉ người nhận</h3>
            <div className="card-content">
              <strong>{address.recipient || 'Không có'}</strong>
              <p>Địa chỉ: {[address.line, address.ward, address.district, address.city].filter(Boolean).join(', ') || 'Không có'}</p>
              <p style={{ marginTop: '8px' }}>Điện thoại: {address.phone || 'Không có'}</p>
            </div>
          </div>

          {/* Col 2: Delivery method */}
          <div className="order-detail-info-card">
            <h3>Phương thức giao hàng</h3>
            <div className="card-content">
              <strong><span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>NHANH</span> Giao hàng tiêu chuẩn</strong>
              <p style={{ margin: '6px 0' }}>Dự kiến giao vào {expectedDateText}</p>
              <p style={{ fontSize: '12px', color: 'var(--muted)' }}>
                {order.status === 'SHIPPED' || order.status === 'DELIVERED'
                  ? 'Giao bởi GHTK'
                  : 'Giao bởi BookVerse Logistics'}
              </p>
              <p style={{ marginTop: '8px', fontWeight: '500' }}>
                {shippingFee === 0 ? 'Miễn phí vận chuyển' : `Phí vận chuyển: ${formatCurrency(shippingFee)}`}
              </p>
              {order.deliveryType === 'GIFT' && (
                <p style={{ marginTop: '8px' }}>Giao quà kèm gói quà</p>
              )}
            </div>
          </div>

          {/* Col 3: Payment method */}
          <div className="order-detail-info-card">
            <h3>Phương thức thanh toán</h3>
            <div className="card-content">
              <p>{getPaymentMethodLabel(order.paymentMethod)}</p>
              <p style={{ marginTop: '10px' }} className={`highlight ${statusConfig.class}`}>
                {order.status === 'PENDING_PAYMENT'
                  ? 'Đang chờ thanh toán.'
                  : order.status === 'CANCELLED'
                    ? 'Đơn hàng này đã bị hủy.'
                    : order.paymentMethod === 'COD'
                      ? 'Thanh toán tiền mặt khi nhận hàng.'
                      : 'Đã thanh toán.'}
              </p>
              {!adminView && order.status === 'PENDING_PAYMENT' && (
                <div className="order-detail-pending-payment">
                  <strong>{formatPaymentTimeLeft(order.expiresAt, now)}</strong>
                  <Button
                    type="button"
                    loading={resuming}
                    disabled={cancelling}
                    onClick={handleContinuePayment}
                  >
                    Tiếp tục thanh toán
                  </Button>
                  <Button
                    type="button"
                    className="pending-payment-cancel"
                    disabled={resuming || cancelling}
                    onClick={() => setShowCancelConfirm(true)}
                  >
                    Hủy đơn
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
                          src={item.coverUrl || `https://placehold.co/120x170?text=${encodeURIComponent(item.title || 'Sách')}`}
                          alt={item.title}
                          className="order-detail-item-cover"
                          onError={(e) => {
                            e.target.src = `https://placehold.co/120x170?text=${encodeURIComponent(item.title || 'Sách')}`;
                          }}
                        />
                      </div>
                      <div className="order-detail-item-info">
                        <h4 className="order-detail-item-title">{item.title}</h4>
                        <span className="order-detail-item-meta">Mã SKU: 395962609{item.bookId || 'Không có'}</span>
                        {!adminView && (
                          <div className="order-detail-item-actions">
                            <Link to="/books/chat" className="btn-action">Chat với AI</Link>
                            {order.status === 'DELIVERED' && (
                              <Link to={`/books/${item.bookId}?review=1#reviews`} className="btn-action btn-action-review">
                                Viết đánh giá
                              </Link>
                            )}
                            <button
                              type="button"
                              className="btn-action"
                              disabled={rebuyingItemIds[item.bookId]}
                              onClick={() => handleRebuy(item.bookId)}
                            >
                              {rebuyingItemIds[item.bookId] ? 'Đang thêm...' : 'Mua lại'}
                            </button>
                          </div>
                        )}
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
              {giftWrapFee > 0 && (
                <div className="order-detail-summary-row">
                  <span>Phí gói quà{order.giftWrapName ? ` (${order.giftWrapName})` : ''}</span>
                  <strong>{formatCurrency(giftWrapFee)}</strong>
                </div>
              )}
              {shippingFee > 0 && (
                <div className="order-detail-summary-row">
                  <span>Giảm phí vận chuyển</span>
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
        {!adminView && (
          <div className="order-detail-footer-actions">
            <Link to={isLoggedIn ? '/orders' : '/'} className="order-detail-back-link">
              &lt;&lt; {isLoggedIn ? 'Quay lại đơn hàng' : 'Quay lại trang chủ'}
            </Link>
            <button
              type="button"
              onClick={() => setShowTimeline(!showTimeline)}
              style={{ padding: '10px 20px', borderRadius: 'var(--radius-sm)', fontSize: '14px', background: '#ffd814', color: '#111', border: '1px solid #fcd200', fontWeight: '500', cursor: 'pointer' }}
            >
              {showTimeline ? 'Ẩn tiến trình' : 'Theo dõi đơn hàng'}
            </button>
          </div>
        )}

        {/* Order Timeline (Track Order history) */}
        {showTimeline && (
          <div className="order-detail-timeline-panel">
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 'bold' }}>Tiến trình đơn hàng</h3>
            <OrderTimeline history={order.statusHistory || []} />
          </div>
        )}

        {!adminView && showCancelConfirm && (
          <ConfirmDialog
            title="Hủy đơn chờ thanh toán?"
            onCancel={() => {
              if (!cancelling) setShowCancelConfirm(false);
            }}
            onConfirm={handleCancelPendingOrder}
          >
            Đơn #{order.id} sẽ bị hủy và số lượng đã giữ sẽ được trả lại kho. Thao tác này không thể hoàn tác.
          </ConfirmDialog>
        )}

        {!adminView && showLockDialog && (
          <ConfirmDialog
            title="Tài khoản bị khóa"
            onCancel={handleLockConfirm}
            onConfirm={handleLockConfirm}
          >
            Tài khoản của bạn đã bị khóa tạm thời trong 15 phút do hủy liên tiếp 5 đơn hàng. Bạn sẽ bị đăng xuất khỏi hệ thống.
          </ConfirmDialog>
        )}

        <RefundRequestModal
          order={order}
          isOpen={showRefundModal}
          onClose={() => setShowRefundModal(false)}
          onSubmitSuccess={fetchRefundInfo}
        />
      </section>
      );
}
