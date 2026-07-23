import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Textarea from '../../components/ui/Textarea';
import { ErrorState, LoadingState } from '../../components/ui/State';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { showToast } from '../../utils/toast';
import { adminService } from '../../services/adminService';
import {
  Building2,
  Camera,
  CheckCircle,
  CircleDollarSign,
  Clock,
  ExternalLink,
  FileText,
  PackageCheck,
  ShieldCheck,
  Truck,
  XCircle,
} from 'lucide-react';

const REASON_LABELS = {
  BOOK_DEFECT: 'Sách bị lỗi',
  WRONG_BOOK: 'Giao sai sách',
  DAMAGED_IN_TRANSIT: 'Sách bị hư hỏng do vận chuyển',
};

const STATUS_META = {
  UNDER_REVIEW: { badgeClass: 'refund-requested', badgeLabel: 'ĐANG XEM XÉT' },
  REJECTED: { badgeClass: 'cancelled', badgeLabel: 'ĐÃ TỪ CHỐI' },
  PICKUP_PENDING: { badgeClass: 'refund-requested', badgeLabel: 'CHỜ GỬI HÀNG' },
  RETURN_RECEIVED: { badgeClass: 'refund-requested', badgeLabel: 'ĐÃ NHẬN HÀNG' },
  INSPECTING: { badgeClass: 'refund-requested', badgeLabel: 'ĐANG KIỂM TRA' },
  REFUND_PROCESSING: { badgeClass: 'refund-requested', badgeLabel: 'ĐANG HOÀN TIỀN' },
  REFUND_COMPLETED: { badgeClass: 'refunded', badgeLabel: 'ĐÃ HOÀN TIỀN' },
  COMPLETED: { badgeClass: 'refunded', badgeLabel: 'HOÀN TẤT' },
};

const steps = [
  { label: 'Tiếp nhận', icon: FileText },
  { label: 'Vận chuyển trả', icon: Truck },
  { label: 'Kiểm tra kho', icon: PackageCheck },
  { label: 'Hoàn tiền', icon: CircleDollarSign },
  { label: 'Hoàn tất', icon: CheckCircle },
];

function EvidenceThumbnail({ url }) {
  const [isVideo, setIsVideo] = useState(false);
  const style = {
    width: '96px',
    height: '96px',
    objectFit: 'cover',
    borderRadius: '8px',
    border: '1px solid var(--border)',
  };
  return isVideo ? (
    <video src={url} style={style} muted />
  ) : (
    <img src={url} alt="Bằng chứng" style={style} onError={() => setIsVideo(true)} />
  );
}

export default function AdminRefundDetailPage() {
  const { id } = useParams();
  const [refund, setRefund] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [approveNote, setApproveNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [inspectionNote, setInspectionNote] = useState('');
  const [processing, setProcessing] = useState(false);

  const loadRefund = useCallback(() => {
    setLoading(true);
    setError(null);
    adminService
      .getRefundRequestById(id)
      .then((data) => {
        setRefund(data);
      })
      .catch((err) => {
        console.error('Failed to load refund request detail:', err);
        setError(err?.response?.data?.message || err?.message || 'Không thể tải chi tiết yêu cầu trả hàng.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    loadRefund();
  }, [loadRefund]);

  const runAction = async (action, successMessage) => {
    setProcessing(true);
    try {
      await action();
      showToast(successMessage, 'success');
      setShowRejectInput(false);
      setRejectReason('');
      setApproveNote('');
      setInspectionNote('');
      loadRefund();
    } catch (err) {
      showToast(err?.response?.data?.message || err?.message || 'Có lỗi xảy ra', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleApprove = () => {
    runAction(
      () => adminService.approveRefundRequest(id, { note: approveNote.trim() || undefined }),
      'Đã duyệt yêu cầu trả hàng thành công!'
    );
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      showToast('Vui lòng nhập lý do từ chối', 'error');
      return;
    }
    runAction(
      () => adminService.rejectRefundRequest(id, { note: rejectReason.trim() }),
      'Đã từ chối yêu cầu trả hàng.'
    );
  };

  const handleConfirmReceived = () =>
    runAction(() => adminService.confirmRefundReceived(id), 'Đã xác nhận nhận hàng trả!');

  const handleStartInspection = () =>
    runAction(() => adminService.startRefundInspection(id), 'Đã bắt đầu kiểm tra hàng trả.');

  const handleCompleteInspection = (passed) => {
    if (!passed && !inspectionNote.trim()) {
      showToast('Vui lòng nhập lý do khi kiểm tra không đạt', 'error');
      return;
    }
    runAction(
      () => adminService.completeRefundInspection(id, { passed, note: inspectionNote.trim() || undefined }),
      passed ? 'Kiểm tra đạt — tiếp tục xử lý.' : 'Đã ghi nhận kiểm tra không đạt.'
    );
  };

  const handleMarkRefundProcessed = () =>
    runAction(() => adminService.markRefundProcessed(id), 'Đã đánh dấu hoàn tiền thành công!');

  const handleClose = () =>
    runAction(() => adminService.closeRefundRequest(id), 'Đã đóng yêu cầu trả hàng.');

  if (loading) {
    return <LoadingState text="Đang tải thông tin yêu cầu trả hàng..." />;
  }

  if (error || !refund) {
    return (
      <ErrorState text={error || 'Không tìm thấy yêu cầu trả hàng.'}>
        <button className="btn" type="button" onClick={loadRefund}>
          Thử lại
        </button>
      </ErrorState>
    );
  }

  const isRejected = refund.status === 'REJECTED';

  const stepsActive = [
    refund.status !== 'REJECTED',
    ['PICKUP_PENDING', 'RETURN_RECEIVED', 'INSPECTING', 'REFUND_PROCESSING', 'REFUND_COMPLETED', 'COMPLETED'].includes(refund.status),
    ['RETURN_RECEIVED', 'INSPECTING', 'REFUND_PROCESSING', 'REFUND_COMPLETED', 'COMPLETED'].includes(refund.status),
    ['REFUND_PROCESSING', 'REFUND_COMPLETED', 'COMPLETED'].includes(refund.status),
    ['REFUND_COMPLETED', 'COMPLETED'].includes(refund.status),
  ];

  return (
    <>
      {/* Back Link */}
      <div style={{ marginBottom: '16px' }}>
        <Link to="/admin/refunds" className="order-detail-back-link" style={{ textDecoration: 'none' }}>
          &lt;&lt; Quay lại danh sách yêu cầu trả hàng
        </Link>
      </div>

      {/* Admin Order Process Flow Box (Same as Xử lý đơn hàng) */}
      <div className={`admin-order-flow-container ${isRejected ? 'cancelled' : ''}`}>
        <div
          className="admin-actions-heading"
          style={{
            width: '100%',
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
              Xử lý yêu cầu trả hàng #{refund.id}
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--muted)' }}>
              Đơn hàng #{refund.orderId} • Tạo lúc {formatDateTime(refund.createdAt)}
            </p>
          </div>
          {refund.status && (
            <span className={`status-badge ${STATUS_META[refund.status]?.badgeClass || 'refund-requested'}`}>
              {STATUS_META[refund.status]?.badgeLabel || refund.status}
            </span>
          )}
        </div>

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
            return (
              <div key={index} className={`admin-order-flow-step ${isActive ? 'active' : ''}`}>
                <div className="admin-order-flow-icon-wrapper">
                  <Icon size={18} />
                </div>
                <div className="admin-order-flow-dot" />
                <span className="admin-order-flow-label">{step.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail 2 Columns Layout */}
      <div className="admin-refund-grid-layout" style={{ marginTop: '16px' }}>
        {/* Left Main Content */}
        <div className="stack" style={{ gap: '20px' }}>
          {/* Summary Hero Card */}
          <div className="admin-refund-hero-card">
            <div className="admin-refund-hero-item">
              <span className="admin-refund-hero-label">Lý do trả hàng</span>
              <strong className="admin-refund-hero-reason">
                {REASON_LABELS[refund.reason] || refund.reason}
              </strong>
            </div>
            <div className="admin-refund-hero-divider" />
            <div className="admin-refund-hero-item">
              <span className="admin-refund-hero-label">Số tiền yêu cầu hoàn</span>
              <strong className="admin-refund-hero-amount">{formatCurrency(refund.requestedAmount)}</strong>
            </div>
          </div>

          {/* Refunded Items List */}
          {refund.items?.length > 0 && (
            <div className="admin-refund-section">
              <h4 className="admin-refund-section-title">
                <PackageCheck size={16} /> Sản phẩm yêu cầu trả ({refund.items.length})
              </h4>
              <div className="admin-refund-items-list">
                {refund.items.map((item) => (
                  <div key={item.orderItemId} className="admin-refund-item-card">
                    <div className="admin-refund-item-info">
                      <span className="admin-refund-item-title">{item.title}</span>
                      <span className="admin-refund-item-qty">
                        Số lượng: <strong>x{item.quantity}</strong>
                      </span>
                    </div>
                    <strong className="admin-refund-item-price">{formatCurrency(item.lineTotal)}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customer Description */}
          <div className="admin-refund-section">
            <h4 className="admin-refund-section-title">
              <FileText size={16} /> Mô tả từ khách hàng
            </h4>
            <div className="admin-refund-desc-box">
              <p>{refund.description || 'Khách hàng không nhập thêm mô tả.'}</p>
            </div>
          </div>

          {/* Evidence Media */}
          {refund.evidence?.length > 0 && (
            <div className="admin-refund-section">
              <h4 className="admin-refund-section-title">
                <Camera size={16} /> Bằng chứng đính kèm ({refund.evidence.length})
              </h4>
              <div className="admin-refund-evidence-grid">
                {refund.evidence.map((ev) => (
                  <a
                    key={ev.id}
                    href={ev.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="admin-refund-evidence-item"
                    title="Xem tệp gốc"
                  >
                    <EvidenceThumbnail url={ev.url} />
                    <span className="admin-refund-evidence-hover-overlay">
                      <ExternalLink size={13} /> Mở tệp
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Timeline & Audit Logs */}
          {(refund.decidedByUserId ||
            refund.returnTrackingCode ||
            refund.receivedByUserId ||
            refund.inspectedByUserId ||
            refund.refundProcessedByUserId) && (
            <div className="admin-refund-section">
              <h4 className="admin-refund-section-title">
                <Clock size={16} /> Lịch sử & Nhật ký xử lý
              </h4>
              <div className="admin-refund-audit-list">
                {refund.decidedByUserId && (
                  <div className="admin-refund-audit-item">
                    <div className="admin-refund-audit-icon">
                      <ShieldCheck size={16} />
                    </div>
                    <div className="admin-refund-audit-content">
                      <strong>Xét duyệt yêu cầu</strong>
                      <span>
                        Xử lý bởi <b>{refund.decidedByName || `Admin #${refund.decidedByUserId}`}</b> lúc{' '}
                        {formatDateTime(refund.decidedAt)}
                      </span>
                      {refund.decisionNote && (
                        <p className="admin-refund-audit-note">Ghi chú: {refund.decisionNote}</p>
                      )}
                    </div>
                  </div>
                )}

                {refund.returnTrackingCode && (
                  <div className="admin-refund-audit-item">
                    <div className="admin-refund-audit-icon">
                      <Truck size={16} />
                    </div>
                    <div className="admin-refund-audit-content">
                      <strong>Vận chuyển trả hàng</strong>
                      <span>
                        Đơn vị: <b>{refund.returnShippingProvider}</b> • Mã vận đơn: <b>{refund.returnTrackingCode}</b>
                      </span>
                      <span className="admin-refund-audit-note">Gửi lúc: {formatDateTime(refund.returnShippedAt)}</span>
                    </div>
                  </div>
                )}

                {refund.receivedByUserId && (
                  <div className="admin-refund-audit-item">
                    <div className="admin-refund-audit-icon">
                      <PackageCheck size={16} />
                    </div>
                    <div className="admin-refund-audit-content">
                      <strong>Xác nhận đã nhận hàng trả</strong>
                      <span>
                        Thực hiện bởi <b>{refund.receivedByName || `Admin #${refund.receivedByUserId}`}</b> lúc{' '}
                        {formatDateTime(refund.receivedAt)}
                      </span>
                    </div>
                  </div>
                )}

                {refund.inspectedByUserId && (
                  <div className="admin-refund-audit-item">
                    <div className="admin-refund-audit-icon">
                      <CheckCircle size={16} />
                    </div>
                    <div className="admin-refund-audit-content">
                      <strong>Kiểm tra kho</strong>
                      <span>
                        Người kiểm tra: <b>{refund.inspectedByName || `Admin #${refund.inspectedByUserId}`}</b> lúc{' '}
                        {formatDateTime(refund.inspectionStartedAt)}
                      </span>
                      {refund.inspectionPassed !== null && refund.inspectionPassed !== undefined && (
                        <span
                          className={`admin-refund-inspect-result ${refund.inspectionPassed ? 'is-pass' : 'is-fail'}`}
                        >
                          Kết quả: {refund.inspectionPassed ? 'ĐẠT CẦU' : 'KHÔNG ĐẠT'}
                        </span>
                      )}
                      {refund.inspectionNote && (
                        <p className="admin-refund-audit-note">Ghi chú: {refund.inspectionNote}</p>
                      )}
                    </div>
                  </div>
                )}

                {refund.refundProcessedByUserId && (
                  <div className="admin-refund-audit-item">
                    <div className="admin-refund-audit-icon">
                      <CheckCircle size={16} />
                    </div>
                    <div className="admin-refund-audit-content">
                      <strong>Hoàn tiền thành công</strong>
                      <span>
                        Xác nhận chuyển tiền bởi <b>{refund.refundProcessedByName || `Admin #${refund.refundProcessedByUserId}`}</b> lúc{' '}
                        {formatDateTime(refund.refundProcessedAt)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Bank Info & Admin Actions */}
        <div className="stack" style={{ gap: '20px' }}>
          {/* Bank Account Info Card */}
          <div className="admin-refund-section">
            <h4 className="admin-refund-section-title">
              <Building2 size={16} /> Tài khoản nhận tiền hoàn
            </h4>
            <div className="admin-refund-bank-card-vertical">
              <div className="admin-refund-bank-row">
                <span className="admin-refund-bank-label">Ngân hàng</span>
                <strong className="admin-refund-bank-val">{refund.bankName || 'Chưa cung cấp'}</strong>
              </div>
              <div className="admin-refund-bank-row">
                <span className="admin-refund-bank-label">Số tài khoản</span>
                <strong className="admin-refund-bank-val is-acc-num">{refund.bankAccountNumber || 'Chưa cung cấp'}</strong>
              </div>
              <div className="admin-refund-bank-row">
                <span className="admin-refund-bank-label">Chủ tài khoản</span>
                <strong className="admin-refund-bank-val is-owner">{refund.bankAccountHolder || 'Chưa cung cấp'}</strong>
              </div>
            </div>
          </div>

          {/* Admin Action Card */}
          <div className="admin-refund-section">
            <h4 className="admin-refund-section-title">
              <ShieldCheck size={16} /> Thao tác quản trị
            </h4>
            <div className="admin-refund-sidebar-action-card">
              {refund.status === 'UNDER_REVIEW' && (
                <div className="admin-refund-action-box">
                  {!showRejectInput ? (
                    <>
                      <Textarea
                        placeholder="Ghi chú duyệt (không bắt buộc)..."
                        value={approveNote}
                        onChange={(e) => setApproveNote(e.target.value)}
                        rows={2}
                      />
                      <div className="admin-refund-action-btns">
                        <Button
                          variant="secondary"
                          className="btn-danger-soft"
                          onClick={() => setShowRejectInput(true)}
                          disabled={processing}
                        >
                          <XCircle size={16} style={{ marginRight: '4px' }} /> Từ chối
                        </Button>
                        <Button
                          className="btn-success-solid"
                          onClick={handleApprove}
                          disabled={processing}
                        >
                          <CheckCircle size={16} style={{ marginRight: '4px' }} /> Duyệt yêu cầu
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="admin-refund-action-box">
                      <Textarea
                        placeholder="Nhập lý do từ chối yêu cầu trả hàng..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={2}
                      />
                      <div className="admin-refund-action-btns">
                        <Button
                          variant="secondary"
                          onClick={() => setShowRejectInput(false)}
                          disabled={processing}
                        >
                          Hủy
                        </Button>
                        <Button
                          className="btn-danger-solid"
                          onClick={handleReject}
                          disabled={processing}
                        >
                          Xác nhận từ chối
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {refund.status === 'PICKUP_PENDING' && (
                <Button
                  className="btn-success-solid"
                  style={{ width: '100%' }}
                  onClick={handleConfirmReceived}
                  disabled={processing}
                >
                  <CheckCircle size={16} style={{ marginRight: '4px' }} /> Xác nhận đã nhận hàng
                </Button>
              )}

              {refund.status === 'RETURN_RECEIVED' && (
                <Button
                  variant="primary"
                  style={{ width: '100%' }}
                  onClick={handleStartInspection}
                  disabled={processing}
                >
                  Bắt đầu kiểm tra hàng
                </Button>
              )}

              {refund.status === 'INSPECTING' && (
                <div className="admin-refund-action-box">
                  <Textarea
                    placeholder="Ghi chú kết quả kiểm tra (bắt buộc nếu không đạt)..."
                    value={inspectionNote}
                    onChange={(e) => setInspectionNote(e.target.value)}
                    rows={2}
                  />
                  <div className="admin-refund-action-btns">
                    <Button
                      variant="secondary"
                      className="btn-danger-soft"
                      onClick={() => handleCompleteInspection(false)}
                      disabled={processing}
                    >
                      Không đạt
                    </Button>
                    <Button
                      className="btn-success-solid"
                      onClick={() => handleCompleteInspection(true)}
                      disabled={processing}
                    >
                      Đạt
                    </Button>
                  </div>
                </div>
              )}

              {refund.status === 'REFUND_PROCESSING' && (
                <Button
                  className="btn-success-solid"
                  style={{ width: '100%' }}
                  onClick={handleMarkRefundProcessed}
                  disabled={processing}
                >
                  <CheckCircle size={16} style={{ marginRight: '4px' }} /> Xác nhận đã chuyển tiền
                </Button>
              )}

              {(refund.status === 'REFUND_COMPLETED' || refund.status === 'COMPLETED') && (
                <Button
                  variant="primary"
                  style={{ width: '100%' }}
                  onClick={handleClose}
                  disabled={processing}
                >
                  Đóng yêu cầu
                </Button>
              )}

              {refund.status === 'REJECTED' && (
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', textAlign: 'center' }}>
                  Yêu cầu này đã bị từ chối và không thể thao tác thêm.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
