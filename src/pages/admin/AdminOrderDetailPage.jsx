import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ErrorState, LoadingState } from '../../components/ui/State';
import OrderDetailPage from '../orders/OrderDetailPage';
import OrderStatusBadge from '../../components/orders/OrderStatusBadge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { adminService } from '../../services/adminService';
import { orderService } from '../../services/orderService';
import { refundService } from '../../services/refundService';
import { ShoppingCart, Warehouse, Truck, CircleDollarSign, User, Package } from 'lucide-react';

const steps = [
  { label: 'Đã đặt', icon: ShoppingCart },
  { label: 'Đã thanh toán', icon: CircleDollarSign },
  { label: 'Đang xử lý', icon: Package },
  { label: 'Đã đóng gói', icon: Warehouse },
  { label: 'Đã giao vận', icon: Truck },
  { label: 'Đã giao', icon: User }
];

export default function AdminOrderDetailPage() {
  const { id } = useParams();
  const [showShipModal, setShowShipModal] = useState(false);
  const [shippingProvider, setShippingProvider] = useState('GHTK');
  const [trackingCode, setTrackingCode] = useState('');
  const [updating, setUpdating] = useState(false);
  const [order, setOrder] = useState(null);
  const [updateError, setUpdateError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [pendingStatusChange, setPendingStatusChange] = useState(null);

  const [refundRequest, setRefundRequest] = useState(null);

  useEffect(() => {
    let active = true;

    orderService.getOrderById(id)
      .then(async (data) => {
        if (!active) return;
        setOrder(data);
        setLoadError('');
        const ref = await refundService.getRefundByOrderId(id);
        if (active) setRefundRequest(ref);
      })
      .catch(err => {
        if (!active) return;
        setOrder(null);
        setLoadError(err.response?.data?.message || err.message || 'Không thể tải đơn hàng.');
      });

    return () => {
      active = false;
    };
  }, [id, retryCount]);

  const retryLoadOrder = () => {
    setOrder(null);
    setLoadError('');
    setRetryCount((count) => count + 1);
  };

  const handleUpdateStatus = async (newStatus) => {
    if (newStatus === 'SHIPPED') {
      setTrackingCode(`TRK-${id}`);
      setShowShipModal(true);
      return;
    }

    if (newStatus === 'PROCESSING' || newStatus === 'DELIVERED') {
      setPendingStatusChange(newStatus);
      return;
    }

    await submitStatus(newStatus);
  };

  const submitStatus = async (status, provider, tracking) => {
    setUpdating(true);
    setUpdateError('');
    try {
      await adminService.updateOrderStatus(id, status, provider, tracking);
      setShowShipModal(false);
      setPendingStatusChange(null);
      retryLoadOrder();
    } catch (err) {
      setUpdateError(err.response?.data?.message || err.message || 'Không thể cập nhật đơn hàng.');
    } finally {
      setUpdating(false);
    }
  };

  const confirmPendingStatusChange = () => {
    if (!pendingStatusChange) return;
    submitStatus(pendingStatusChange);
  };

  const getPendingStatusMessage = () => {
    if (pendingStatusChange === 'PROCESSING') {
      return `Đánh dấu đơn #${id} là đã đóng gói? Khách hàng sẽ thấy quá trình đóng gói đã bắt đầu.`;
    }
    if (pendingStatusChange === 'DELIVERED') {
      return `Đánh dấu đơn #${id} là đã giao? Thao tác này sẽ hoàn tất đơn hàng.`;
    }
    return 'Xác nhận thay đổi trạng thái này?';
  };

  const handleShipSubmit = (e) => {
    e.preventDefault();
    if (!shippingProvider || !trackingCode) return;
    submitStatus('SHIPPED', shippingProvider, trackingCode);
  };

  const status = order?.status;
  const isCancelled = status === 'CANCELLED';

  const stepsActive = [
    status !== 'CANCELLED', // Step 1: Placed
    ['PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'RE_DELIVERY', 'DELIVERED'].includes(status), // Step 2: Paid
    ['PROCESSING', 'PACKED', 'SHIPPED', 'RE_DELIVERY', 'DELIVERED'].includes(status), // Step 3: Processing
    ['PACKED', 'SHIPPED', 'RE_DELIVERY', 'DELIVERED'].includes(status), // Step 4: Packed
    ['SHIPPED', 'RE_DELIVERY', 'DELIVERED'].includes(status), // Step 5: Shipped
    status === 'DELIVERED' // Step 6: Delivered
  ];

  const getNextStepIndex = () => {
    if (status === 'PAID') return 2; // Index 2 is "Processing" (Step 3)
    if (status === 'PROCESSING') return 3; // Index 3 is "Packed" (Step 4)
    if (status === 'PACKED') return 4; // Index 4 is "Shipped" (Step 5)
    if (status === 'SHIPPED' || status === 'RE_DELIVERY') return 5; // Index 5 is "Delivered" (Step 6)
    return -1;
  };

  const nextStepIndex = getNextStepIndex();

  const handleStepClick = (index) => {
    if (index !== nextStepIndex || updating) return;
    if (index === 2) {
      // Step 3 (Processing): Transition from PAID -> PROCESSING
      submitStatus('PROCESSING');
    } else if (index === 3) {
      // Step 4 (Packed): Transition from PROCESSING -> PACKED
      submitStatus('PACKED');
    } else if (index === 4) {
      // Step 5 (Shipped): Show modal to transition from PACKED -> SHIPPED
      setTrackingCode(`TRK-${id}`);
      setShowShipModal(true);
    } else if (index === 5) {
      // Step 6 (Delivered): Transition from SHIPPED -> DELIVERED
      submitStatus('DELIVERED');
    }
  };

  const getStepTooltip = (index, label) => {
    if (index !== nextStepIndex) return undefined;
    if (index === 2) return `Nhấn để bắt đầu xử lý (${label})`;
    if (index === 3) return `Nhấn để đóng gói đơn hàng (${label})`;
    if (index === 4) return `Nhấn để nhập thông tin giao hàng (${label})`;
    if (index === 5) return `Nhấn để hoàn tất đơn hàng (${label})`;
    return undefined;
  };

  return (
    <>
      <div style={{ marginBottom: '16px' }}>
        <Link to="/admin/orders" className="order-detail-back-link" style={{ textDecoration: 'none' }}>
          &lt;&lt; Quay lại đơn hàng
        </Link>
      </div>

      {!order && !loadError && <LoadingState text="Đang tải đơn hàng..." />}
      {loadError && (
        <ErrorState text={loadError}>
          <button className="btn" type="button" onClick={retryLoadOrder}>
            Thử lại
          </button>
        </ErrorState>
      )}

      {order && (
        <div className={`admin-order-flow-container ${isCancelled ? 'cancelled' : ''}`}>
          <div className="admin-actions-heading" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Xử lý đơn hàng</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--muted)' }}>
                Theo dõi tiến độ và cập nhật trạng thái.
              </p>
            </div>
            {order?.status && <OrderStatusBadge status={order.status} />}
          </div>

          {refundRequest && (() => {
            const REFUND_REASON_LABELS = {
              BOOK_DEFECT: 'Sách bị lỗi',
              WRONG_BOOK: 'Giao sai sách',
              MISSING_BOOK: 'Thiếu sách trong đơn hàng',
              DAMAGED_IN_TRANSIT: 'Sách bị hư hỏng do vận chuyển',
              CHANGE_OF_MIND: 'Đổi ý, không muốn mua nữa',
            };
            const DONE_STATUSES = ['REFUND_COMPLETED', 'COMPLETED'];
            const isRejected = refundRequest.status === 'REJECTED';
            const isDone = DONE_STATUSES.includes(refundRequest.status);
            const color = isRejected ? '#dc2626' : isDone ? '#047857' : '#d97706';
            const bg = isRejected ? 'rgba(239, 68, 68, 0.08)' : isDone ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)';
            const border = isRejected ? 'rgba(239, 68, 68, 0.2)' : isDone ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)';
            return (
              <div style={{
                width: '100%',
                margin: '16px 0',
                padding: '12px 16px',
                borderRadius: '8px',
                background: bg,
                border: `1px solid ${border}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                boxSizing: 'border-box',
              }}>
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: '14px', color }}>
                    ĐƠN HÀNG CÓ YÊU CẦU TRẢ HÀNG — TRẠNG THÁI: {refundRequest.status}
                  </strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--muted)' }}>
                    Lý do: <strong>{REFUND_REASON_LABELS[refundRequest.reason] || refundRequest.reason}</strong> · Ngân hàng: <strong>{refundRequest.bankName} ({refundRequest.bankAccountNumber})</strong>
                  </p>
                </div>
                <Link to="/admin/refunds" className="btn-secondary" style={{ fontSize: '12px', padding: '5px 10px', whiteSpace: 'nowrap', textDecoration: 'none', borderRadius: '6px' }}>
                  Đến trang duyệt &rarr;
                </Link>
              </div>
            );
          })()}

          <div className="admin-order-flow-steps" style={{ margin: '16px 0 20px 0' }}>
            <div className="admin-order-flow-lines">
              <div className={`admin-order-flow-line-segment ${stepsActive[0] && stepsActive[1] ? 'active' : ''}`} />
              <div className={`admin-order-flow-line-segment ${stepsActive[1] && stepsActive[2] ? 'active' : ''}`} />
              <div className={`admin-order-flow-line-segment ${stepsActive[2] && stepsActive[3] ? 'active' : ''}`} />
              <div className={`admin-order-flow-line-segment ${stepsActive[3] && stepsActive[4] ? 'active' : ''}`} />
            </div>

            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = stepsActive[index];
              const isClickable = index === nextStepIndex && !updating;
              return (
                <div 
                  key={index} 
                  className={`admin-order-flow-step ${isActive ? 'active' : ''} ${isClickable ? 'clickable' : ''}`}
                  onClick={() => handleStepClick(index)}
                  title={getStepTooltip(index, step.label)}
                >
                  <div className="admin-order-flow-icon-wrapper">
                    <Icon size={18} />
                  </div>
                  <div className="admin-order-flow-dot" />
                  <span className="admin-order-flow-label">{step.label}</span>
                </div>
              );
            })}
          </div>

          {updateError && (
            <div style={{ width: '100%', borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '12px' }}>
              <p className="admin-action-error" role="alert" style={{ color: 'var(--error)', margin: 0, textAlign: 'center' }}>{updateError}</p>
            </div>
          )}
        </div>
      )}

      {showShipModal && (
        <Modal title="Thông tin giao hàng" onClose={() => setShowShipModal(false)} hideClose={true}>
          <form onSubmit={handleShipSubmit} style={{ padding: '16px' }}>
            <Input
              label="Đơn vị vận chuyển"
              value={shippingProvider}
              onChange={(e) => setShippingProvider(e.target.value)}
              required
            />
            <Input
              label="Mã vận đơn"
              value={trackingCode}
              onChange={(e) => setTrackingCode(e.target.value)}
              required
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <Button type="button" className="btn-secondary" onClick={() => setShowShipModal(false)}>Hủy</Button>
              <Button type="submit" variant="primary" loading={updating}>Xác nhận giao hàng</Button>
            </div>
          </form>
        </Modal>
      )}

      {pendingStatusChange && (
        <ConfirmDialog
          title="Xác nhận cập nhật trạng thái"
          onCancel={() => setPendingStatusChange(null)}
          onConfirm={confirmPendingStatusChange}
        >
          {getPendingStatusMessage()}
        </ConfirmDialog>
      )}

      {!loadError && <OrderDetailPage adminView />}
    </>
  );
}
