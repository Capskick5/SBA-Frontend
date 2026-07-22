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

const REFUND_STATUS_META = {
  RETURN_REQUESTED: { badgeClass: 'refund-requested', badgeLabel: 'ĐÃ GỬI YÊU CẦU', bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.2)', heading: 'Yêu cầu trả hàng đã được ghi nhận — vui lòng nộp bằng chứng bên dưới' },
  WAITING_EVIDENCE: { badgeClass: 'refund-requested', badgeLabel: 'CẦN BỔ SUNG BẰNG CHỨNG', bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.2)', heading: 'Vui lòng nộp thêm bằng chứng (hình ảnh/video) để CSKH xem xét' },
  UNDER_REVIEW: { badgeClass: 'refund-requested', badgeLabel: 'ĐANG XEM XÉT', bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.2)', heading: 'Yêu cầu đang được CSKH xem xét' },
  APPROVED: { badgeClass: 'refund-requested', badgeLabel: 'ĐÃ DUYỆT', bg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.2)', heading: 'Yêu cầu đã được duyệt' },
  REJECTED: { badgeClass: 'cancelled', badgeLabel: 'TỪ CHỐI', bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.2)', heading: 'Yêu cầu trả hàng bị từ chối' },
  PICKUP_PENDING: { badgeClass: 'refund-requested', badgeLabel: 'CHỜ GỬI HÀNG TRẢ', bg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.2)', heading: 'Yêu cầu đã được chấp nhận — vui lòng gửi sản phẩm về kho' },
  RETURN_RECEIVED: { badgeClass: 'refund-requested', badgeLabel: 'ĐÃ NHẬN HÀNG TRẢ', bg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.2)', heading: 'Kho đã nhận được hàng trả, chờ kiểm tra' },
  INSPECTING: { badgeClass: 'refund-requested', badgeLabel: 'ĐANG KIỂM TRA HÀNG', bg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.2)', heading: 'Kho đang kiểm tra tình trạng sản phẩm trả về' },
  RESHIP_PENDING: { badgeClass: 'refund-requested', badgeLabel: 'CHỜ GỬI HÀNG THAY THẾ', bg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.2)', heading: 'Yêu cầu đã được duyệt — BookVerse sẽ gửi lại sách còn thiếu' },
  EXCHANGE_SHIPPING: { badgeClass: 'refund-requested', badgeLabel: 'ĐANG GỬI HÀNG ĐỔI', bg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.2)', heading: 'Đang gửi sách thay thế cho bạn' },
  REFUND_PROCESSING: { badgeClass: 'refund-requested', badgeLabel: 'ĐANG XỬ LÝ HOÀN TIỀN', bg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.2)', heading: 'Yêu cầu hoàn tiền đang được xử lý' },
  REFUND_COMPLETED: { badgeClass: 'refunded', badgeLabel: 'ĐÃ HOÀN TIỀN', bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.2)', heading: 'Đã hoàn tiền vào tài khoản đã cung cấp' },
  COMPLETED: { badgeClass: 'refunded', badgeLabel: 'HOÀN TẤT', bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.2)', heading: 'Yêu cầu trả hàng đã hoàn tất' },
};

const REASON_LABELS = {
  BOOK_DEFECT: 'Sách bị lỗi',
  WRONG_BOOK: 'Giao sai sách',
  MISSING_BOOK: 'Thiếu sách trong đơn hàng',
  DAMAGED_IN_TRANSIT: 'Sách bị hư hỏng do vận chuyển',
  CHANGE_OF_MIND: 'Đổi ý, không muốn mua nữa',
};

const EVIDENCE_ACCEPTING_STATUSES = ['RETURN_REQUESTED', 'WAITING_EVIDENCE'];

function EvidenceThumbnail({ url }) {
  const [isVideo, setIsVideo] = useState(false);
  const style = { width: '96px', height: '96px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)' };
  return isVideo
    ? <video src={url} style={style} muted />
    : <img src={url} alt="Bằng chứng" style={style} onError={() => setIsVideo(true)} />;
}

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
  const [returnProvider, setReturnProvider] = useState('');
  const [returnTrackingCode, setReturnTrackingCode] = useState('');
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [evidenceInputKey, setEvidenceInputKey] = useState(0);
  const [submittingEvidence, setSubmittingEvidence] = useState(false);

  const fetchRefundInfo = async () => {
    if (!id) return;
    try {
      const existing = await refundService.getRefundByOrderId(id);
      setRefundRequest(existing);
    } catch (err) {
      console.error('Failed to load refund request info:', err);
    }
  };

  useEffect(() => {
    fetchRefundInfo();
  }, [id]);

  const handleSubmitEvidence = async (e) => {
    e.preventDefault();
    if (!evidenceFile) {
      showToast('Vui lòng chọn một tệp hình ảnh hoặc video', 'error');
      return;
    }
    setSubmittingEvidence(true);
    try {
      const { url } = await refundService.uploadEvidenceFile(evidenceFile);
      await refundService.submitEvidence(order.id, refundRequest.id, { url });
      showToast('Đã nộp bằng chứng thành công!', 'success');
      setEvidenceFile(null);
      setEvidenceInputKey((key) => key + 1);
      fetchRefundInfo();
    } catch (err) {
      showToast(err?.message || 'Có lỗi xảy ra, vui lòng thử lại.', 'error');
    } finally {
      setSubmittingEvidence(false);
    }
  };

  const handleSubmitReturnShipment = async (e) => {
    e.preventDefault();
    if (!returnProvider.trim() || !returnTrackingCode.trim()) {
      showToast('Vui lòng nhập đầy đủ nhà vận chuyển và mã vận đơn', 'error');
      return;
    }
    setSubmittingReturn(true);
    try {
      await refundService.submitReturnShipment(order.id, refundRequest.id, {
        shippingProvider: returnProvider.trim(),
        trackingCode: returnTrackingCode.trim(),
      });
      showToast('Đã gửi thông tin vận chuyển trả hàng thành công!', 'success');
      setReturnProvider('');
      setReturnTrackingCode('');
      fetchRefundInfo();
    } catch (err) {
      showToast(err?.message || 'Có lỗi xảy ra, vui lòng thử lại.', 'error');
    } finally {
      setSubmittingReturn(false);
    }
  };

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
          <Link to={isLoggedIn ? '/profile?tab=orders' : '/'}><Button>Quay lại {isLoggedIn ? 'đơn hàng' : 'trang chủ'}</Button></Link>
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
          {!adminView && (order.status === 'DELIVERED' || refundRequest) && (
            <div>
              {!refundRequest ? (
                <Button className="btn-secondary" style={{ background: 'rgba(225, 29, 72, 0.08)', borderColor: 'rgba(225, 29, 72, 0.3)', color: '#e11d48', fontWeight: 600 }} onClick={() => setShowRefundModal(true)}>
                  Trả hàng / Hoàn tiền
                </Button>
              ) : (
                <span className={`status-badge ${REFUND_STATUS_META[refundRequest.status]?.badgeClass || 'refund-requested'}`}>
                  Yêu cầu trả hàng: {REFUND_STATUS_META[refundRequest.status]?.badgeLabel || refundRequest.status}
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
          background: REFUND_STATUS_META[refundRequest.status]?.bg || 'rgba(245, 158, 11, 0.08)',
          border: `1px solid ${REFUND_STATUS_META[refundRequest.status]?.border || 'rgba(245, 158, 11, 0.2)'}`,
        }}>
          <h4 style={{ margin: '0 0 6px 0', fontSize: '15px' }}>
            {refundRequest.evidence?.length > 0 && refundRequest.status === 'WAITING_EVIDENCE'
              ? `Đã nộp bằng chứng (${refundRequest.evidence.length} tệp) — Bạn có thể nộp thêm nếu cần`
              : (REFUND_STATUS_META[refundRequest.status]?.heading || refundRequest.status)}
          </h4>
          <p style={{ margin: '0', fontSize: '13px', color: 'var(--muted)' }}>
            Lý do trả hàng: <strong>{REASON_LABELS[refundRequest.reason] || refundRequest.reason}</strong> · Tài khoản nhận tiền: <strong>{refundRequest.bankName} - {refundRequest.bankAccountNumber} ({refundRequest.bankAccountHolder})</strong>
          </p>
          {refundRequest.items?.length > 0 && (
            <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--muted)' }}>
              Sản phẩm yêu cầu trả: <strong>{refundRequest.items.map((item) => `${item.title} (x${item.quantity})`).join(', ')}</strong>
            </p>
          )}
          {refundRequest.status === 'REJECTED' && (refundRequest.inspectionNote || refundRequest.decisionNote) && (
            <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#ef4444' }}>
              Lý do từ chối: {refundRequest.inspectionNote || refundRequest.decisionNote}
            </p>
          )}

          {EVIDENCE_ACCEPTING_STATUSES.includes(refundRequest.status) && (
            <form onSubmit={handleSubmitEvidence} style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ margin: 0, fontSize: '13px' }}>
                {refundRequest.evidence?.length > 0
                  ? 'Nộp thêm tệp bằng chứng khác (hình ảnh/video):'
                  : 'Vui lòng nộp bằng chứng (hình ảnh/video) để CSKH xem xét yêu cầu của bạn:'}
              </p>
              <input
                key={evidenceInputKey}
                type="file"
                accept="image/*,video/*"
                onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '13px' }}
              />
              {evidenceFile && (
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)' }}>
                  Đã chọn: {evidenceFile.name} ({(evidenceFile.size / 1024 / 1024).toFixed(1)} MB)
                </p>
              )}
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)' }}>
                Chấp nhận hình ảnh hoặc video, tối đa 20MB.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="submit" variant="primary" disabled={submittingEvidence}>
                  {submittingEvidence ? 'Đang tải lên...' : 'Nộp bằng chứng'}
                </Button>
              </div>
            </form>
          )}

          {refundRequest.evidence?.length > 0 && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed var(--border)' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '600' }}>Bằng chứng đã nộp:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {refundRequest.evidence.map((ev) => (
                  <a key={ev.id} href={ev.url} target="_blank" rel="noreferrer" style={{ display: 'block' }}>
                    <EvidenceThumbnail url={ev.url} />
                  </a>
                ))}
              </div>
            </div>
          )}

          {refundRequest.status === 'PICKUP_PENDING' && !refundRequest.returnTrackingCode && (
            <form onSubmit={handleSubmitReturnShipment} style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ margin: 0, fontSize: '13px' }}>Vui lòng gửi sản phẩm về cho BookVerse và nhập thông tin vận chuyển bên dưới:</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <input
                  value={returnProvider}
                  onChange={(e) => setReturnProvider(e.target.value)}
                  placeholder="Nhà vận chuyển (VD: GHTK, GHN...)"
                  style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '13px' }}
                />
                <input
                  value={returnTrackingCode}
                  onChange={(e) => setReturnTrackingCode(e.target.value)}
                  placeholder="Mã vận đơn"
                  style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '13px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="submit" variant="primary" disabled={submittingReturn}>
                  {submittingReturn ? 'Đang gửi...' : 'Xác nhận đã gửi hàng'}
                </Button>
              </div>
            </form>
          )}

          {refundRequest.returnTrackingCode && (
            <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--muted)' }}>
              Vận chuyển trả hàng: <strong>{refundRequest.returnShippingProvider} - {refundRequest.returnTrackingCode}</strong>
              {refundRequest.status === 'PICKUP_PENDING' && ' (chờ BookVerse xác nhận đã nhận được hàng)'}
            </p>
          )}

          {refundRequest.replacementTrackingCode && (
            <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--muted)' }}>
              Vận chuyển hàng thay thế: <strong>{refundRequest.replacementShippingProvider} - {refundRequest.replacementTrackingCode}</strong>
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
          <Link to={isLoggedIn ? '/profile?tab=orders' : '/'} className="order-detail-back-link">
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
