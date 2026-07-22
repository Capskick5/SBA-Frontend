import { useCallback, useEffect, useState } from 'react';
import AdminPagination from '../../components/ui/AdminPagination';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Textarea from '../../components/ui/Textarea';
import { ErrorState, LoadingState } from '../../components/ui/State';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { showToast } from '../../utils/toast';
import { adminService } from '../../services/adminService';
import { RotateCcw, CheckCircle, XCircle, Eye } from 'lucide-react';

const PAGE_SIZE = 10;

const REASON_LABELS = {
  BOOK_DEFECT: 'Sách bị lỗi',
  WRONG_BOOK: 'Giao sai sách',
  MISSING_BOOK: 'Thiếu sách trong đơn hàng',
  DAMAGED_IN_TRANSIT: 'Sách bị hư hỏng do vận chuyển',
  CHANGE_OF_MIND: 'Đổi ý, không muốn mua nữa',
};

function EvidenceThumbnail({ url }) {
  const [isVideo, setIsVideo] = useState(false);
  const style = { width: '96px', height: '96px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)' };
  return isVideo
    ? <video src={url} style={style} muted />
    : <img src={url} alt="Bằng chứng" style={style} onError={() => setIsVideo(true)} />;
}

const RESOLUTION_LABELS = {
  RESHIP: 'Gửi lại sách thiếu (RESHIP)',
  EXCHANGE: 'Đổi sách mới (EXCHANGE)',
  REFUND: 'Hoàn tiền (REFUND)',
};

const RESOLUTION_ELIGIBILITY = {
  RESHIP: (reason) => reason === 'MISSING_BOOK',
  EXCHANGE: (reason) => ['WRONG_BOOK', 'BOOK_DEFECT', 'DAMAGED_IN_TRANSIT'].includes(reason),
  REFUND: () => true,
};

const STATUS_TABS = [
  { id: 'ALL', label: 'Tất cả', statuses: [] },
  { id: 'PENDING_REVIEW', label: 'Chờ xử lý', statuses: ['RETURN_REQUESTED', 'WAITING_EVIDENCE', 'UNDER_REVIEW', 'PENDING'] },
  { id: 'IN_PROGRESS', label: 'Đang xử lý', statuses: ['PICKUP_PENDING', 'RETURN_RECEIVED', 'INSPECTING', 'RESHIP_PENDING', 'EXCHANGE_SHIPPING', 'REFUND_PROCESSING'] },
  { id: 'DONE', label: 'Hoàn tất', statuses: ['REFUND_COMPLETED', 'COMPLETED'] },
  { id: 'REJECTED', label: 'Từ chối', statuses: ['REJECTED'] },
];

const STATUS_META = {
  PENDING: { badgeClass: 'refund-requested', badgeLabel: 'CHỜ XỬ LÝ' },
  RETURN_REQUESTED: { badgeClass: 'refund-requested', badgeLabel: 'ĐÃ GỬI YÊU CẦU' },
  WAITING_EVIDENCE: { badgeClass: 'refund-requested', badgeLabel: 'CHỜ BẰNG CHỨNG' },
  UNDER_REVIEW: { badgeClass: 'refund-requested', badgeLabel: 'ĐANG XEM XÉT' },
  APPROVED: { badgeClass: 'refund-requested', badgeLabel: 'ĐÃ DUYỆT' },
  REJECTED: { badgeClass: 'cancelled', badgeLabel: 'TỪ CHỐI' },
  PICKUP_PENDING: { badgeClass: 'refund-requested', badgeLabel: 'CHỜ NHẬN HÀNG' },
  RETURN_RECEIVED: { badgeClass: 'refund-requested', badgeLabel: 'ĐÃ NHẬN HÀNG' },
  INSPECTING: { badgeClass: 'refund-requested', badgeLabel: 'ĐANG KIỂM TRA' },
  RESHIP_PENDING: { badgeClass: 'refund-requested', badgeLabel: 'CHỜ GỬI LẠI HÀNG' },
  EXCHANGE_SHIPPING: { badgeClass: 'refund-requested', badgeLabel: 'ĐANG GỬI HÀNG ĐỔI' },
  REFUND_PROCESSING: { badgeClass: 'refund-requested', badgeLabel: 'ĐANG HOÀN TIỀN' },
  REFUND_COMPLETED: { badgeClass: 'refunded', badgeLabel: 'ĐÃ HOÀN TIỀN' },
  COMPLETED: { badgeClass: 'refunded', badgeLabel: 'HOÀN TẤT' },
};

export default function AdminRefundsPage() {
  const [refunds, setRefunds] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [filterTab, setFilterTab] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [approveResolutionType, setApproveResolutionType] = useState('');
  const [approveNote, setApproveNote] = useState('');
  const [inspectionNote, setInspectionNote] = useState('');
  const [replacementProvider, setReplacementProvider] = useState('');
  const [replacementTrackingCode, setReplacementTrackingCode] = useState('');
  const [processing, setProcessing] = useState(false);

  const loadRefunds = useCallback(() => {
    setLoading(true);
    setError(null);
    const tab = STATUS_TABS.find((t) => t.id === filterTab);
    adminService.getRefundRequests({
      page,
      size: PAGE_SIZE,
      sort: 'createdAt,desc',
      statuses: tab?.statuses?.length ? tab.statuses : undefined,
    })
      .then((result) => {
        setRefunds(result?.items || result?.content || []);
        setTotalItems(result?.totalItems ?? result?.totalElements ?? 0);
        setTotalPages(result?.totalPages ?? 0);
      })
      .catch((err) => {
        console.error('Failed to load refund requests:', err);
        setError('Không tải được danh sách yêu cầu trả hàng. Vui lòng thử lại.');
      })
      .finally(() => setLoading(false));
  }, [page, filterTab]);

  useEffect(() => {
    loadRefunds();
  }, [loadRefunds]);

  const errorMessage = (err) => err?.response?.data?.message || err?.message || 'Có lỗi xảy ra';

  const resetDetailForms = () => {
    setShowRejectInput(false);
    setRejectReason('');
    setApproveResolutionType('');
    setApproveNote('');
    setInspectionNote('');
    setReplacementProvider('');
    setReplacementTrackingCode('');
  };

  const closeAndReload = () => {
    setSelectedRefund(null);
    resetDetailForms();
    if (refunds.length === 1 && page > 0) {
      setPage((current) => current - 1);
    } else {
      loadRefunds();
    }
  };

  const runAction = async (action, successMessage) => {
    setProcessing(true);
    try {
      await action();
      showToast(successMessage, 'success');
      closeAndReload();
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleApprove = (id) => {
    if (!approveResolutionType) {
      showToast('Vui lòng chọn hướng xử lý', 'error');
      return;
    }
    runAction(
      () => adminService.approveRefundRequest(id, { resolutionType: approveResolutionType, note: approveNote.trim() || undefined }),
      'Đã duyệt yêu cầu trả hàng thành công!'
    );
  };

  const handleReject = (id) => {
    if (!rejectReason.trim()) {
      showToast('Vui lòng nhập lý do từ chối', 'error');
      return;
    }
    runAction(() => adminService.rejectRefundRequest(id, { note: rejectReason.trim() }), 'Đã từ chối yêu cầu trả hàng.');
  };

  const handleConfirmReceived = (id) =>
    runAction(() => adminService.confirmRefundReceived(id), 'Đã xác nhận nhận hàng trả!');

  const handleStartInspection = (id) =>
    runAction(() => adminService.startRefundInspection(id), 'Đã bắt đầu kiểm tra hàng trả.');

  const handleCompleteInspection = (id, passed) => {
    if (!passed && !inspectionNote.trim()) {
      showToast('Vui lòng nhập lý do khi kiểm tra không đạt', 'error');
      return;
    }
    runAction(
      () => adminService.completeRefundInspection(id, { passed, note: inspectionNote.trim() || undefined }),
      passed ? 'Kiểm tra đạt — tiếp tục xử lý.' : 'Đã ghi nhận kiểm tra không đạt.'
    );
  };

  const handleSubmitReplacement = (id) => {
    if (!replacementProvider.trim() || !replacementTrackingCode.trim()) {
      showToast('Vui lòng nhập đầy đủ nhà vận chuyển và mã vận đơn', 'error');
      return;
    }
    runAction(
      () => adminService.submitReplacementShipment(id, { shippingProvider: replacementProvider.trim(), trackingCode: replacementTrackingCode.trim() }),
      'Đã lưu thông tin vận chuyển hàng thay thế.'
    );
  };

  const handleMarkRefundProcessed = (id) =>
    runAction(() => adminService.markRefundProcessed(id), 'Đã đánh dấu hoàn tiền thành công!');

  const handleClose = (id) =>
    runAction(() => adminService.closeRefundRequest(id), 'Đã đóng yêu cầu trả hàng.');

  const columns = [
    { key: 'id', label: 'Mã yêu cầu' },
    { key: 'orderId', label: 'Đơn hàng', render: (row) => <strong>#{row.orderId}</strong> },
    { key: 'requestedAmount', label: 'Số tiền hoàn', render: (row) => <strong style={{ color: '#ef4444' }}>{formatCurrency(row.requestedAmount)}</strong> },
    { key: 'reason', label: 'Lý do', render: (row) => REASON_LABELS[row.reason] || row.reason },
    { key: 'createdAt', label: 'Ngày yêu cầu', render: (row) => formatDateTime(row.createdAt) },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (row) => (
        <span className={`status-badge ${STATUS_META[row.status]?.badgeClass || 'refund-requested'}`}>
          {STATUS_META[row.status]?.badgeLabel || row.status}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Thao tác',
      render: (row) => (
        <div className="admin-row-actions">
          <Button type="button" variant="secondary" size="sm" onClick={() => { setSelectedRefund(row); resetDetailForms(); }}>
            <Eye size={14} /> Chi tiết
          </Button>
        </div>
      ),
    },
  ];

  return (
    <section className="stack" style={{ gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <RotateCcw size={28} color="var(--accent)" /> Quản Lý Yêu Cầu Trả Hàng / Hoàn Tiền
          </h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--muted)', fontSize: '14px' }}>
            Xem xét và xử lý các yêu cầu trả hàng / hoàn tiền từ khách hàng ({totalItems} yêu cầu)
          </p>
        </div>
      </div>

      {/* Tabs Filter */}
      <div className="admin-filter-tabs">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`admin-filter-tab ${filterTab === tab.id ? 'is-active' : ''}`}
            onClick={() => { setFilterTab(tab.id); setPage(0); }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState text="Đang tải yêu cầu trả hàng..." />
      ) : error ? (
        <ErrorState text={error}>
          <Button onClick={loadRefunds}>Thử lại</Button>
        </ErrorState>
      ) : (
        <>
          <Table columns={columns} rows={refunds} emptyText="Chưa có yêu cầu trả hàng nào." />
          {totalPages > 0 && (
            <AdminPagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      {/* Refund Detail Modal */}
      {selectedRefund && (
        <Modal isOpen={!!selectedRefund} onClose={() => setSelectedRefund(null)} title={`Chi tiết yêu cầu trả hàng - Đơn #${selectedRefund.orderId}`}>
          <div className="stack" style={{ gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'var(--surface-alt)', padding: '12px', borderRadius: '8px' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Lý do trả hàng:</span>
                <p style={{ margin: '2px 0 0 0', fontWeight: 'bold' }}>{REASON_LABELS[selectedRefund.reason] || selectedRefund.reason}</p>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Số tiền yêu cầu hoàn:</span>
                <p style={{ margin: '2px 0 0 0', fontWeight: 'bold', color: '#ef4444' }}>{formatCurrency(selectedRefund.requestedAmount)}</p>
              </div>
            </div>

            {selectedRefund.items?.length > 0 && (
              <div>
                <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Sản phẩm yêu cầu trả:</span>
                <div style={{ background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  {selectedRefund.items.map((item) => (
                    <div key={item.orderItemId} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', fontSize: '13px', borderBottom: '1px solid var(--border)' }}>
                      <span>{item.title} <span style={{ color: 'var(--muted)' }}>x{item.quantity}</span></span>
                      <strong>{formatCurrency(item.lineTotal)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Mô tả từ khách hàng:</span>
              <p style={{ margin: 0, background: 'var(--surface)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                {selectedRefund.description || 'Không có mô tả thêm.'}
              </p>
            </div>

            {selectedRefund.evidence?.length > 0 && (
              <div>
                <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Bằng chứng đã nộp:</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {selectedRefund.evidence.map((ev) => (
                    <a key={ev.id} href={ev.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
                      <EvidenceThumbnail url={ev.url} />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '12px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Thông tin tài khoản nhận tiền hoàn</h4>
              <p style={{ margin: '2px 0', fontSize: '13px' }}>Ngân hàng: <strong>{selectedRefund.bankName}</strong></p>
              <p style={{ margin: '2px 0', fontSize: '13px' }}>Số tài khoản: <strong>{selectedRefund.bankAccountNumber}</strong></p>
              <p style={{ margin: '2px 0', fontSize: '13px' }}>Chủ tài khoản: <strong>{selectedRefund.bankAccountHolder}</strong></p>
            </div>

            {selectedRefund.decidedByUserId && (
              <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '12px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Quyết định xét duyệt</h4>
                <p style={{ margin: '2px 0', fontSize: '13px' }}>
                  Xử lý bởi: <strong>{selectedRefund.decidedByName || `Admin #${selectedRefund.decidedByUserId}`}</strong> vào lúc <strong>{formatDateTime(selectedRefund.decidedAt)}</strong>
                </p>
                {selectedRefund.resolutionType && (
                  <p style={{ margin: '2px 0', fontSize: '13px' }}>Hướng xử lý: <strong>{RESOLUTION_LABELS[selectedRefund.resolutionType] || selectedRefund.resolutionType}</strong></p>
                )}
                {selectedRefund.decisionNote && (
                  <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: selectedRefund.status === 'REJECTED' ? '#ef4444' : 'var(--muted)' }}>
                    Ghi chú: {selectedRefund.decisionNote}
                  </p>
                )}
              </div>
            )}

            {selectedRefund.returnTrackingCode && (
              <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '12px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Vận chuyển trả hàng (khách gửi về)</h4>
                <p style={{ margin: '2px 0', fontSize: '13px' }}>Nhà vận chuyển: <strong>{selectedRefund.returnShippingProvider}</strong></p>
                <p style={{ margin: '2px 0', fontSize: '13px' }}>Mã vận đơn: <strong>{selectedRefund.returnTrackingCode}</strong></p>
                <p style={{ margin: '2px 0', fontSize: '13px' }}>Khách gửi lúc: <strong>{formatDateTime(selectedRefund.returnShippedAt)}</strong></p>
              </div>
            )}

            {selectedRefund.receivedByUserId && (
              <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '12px' }}>
                <p style={{ margin: '2px 0', fontSize: '13px' }}>
                  Đã nhận hàng bởi: <strong>{selectedRefund.receivedByName || `Admin #${selectedRefund.receivedByUserId}`}</strong> vào lúc <strong>{formatDateTime(selectedRefund.receivedAt)}</strong>
                </p>
              </div>
            )}

            {selectedRefund.inspectedByUserId && (
              <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '12px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Kiểm tra kho</h4>
                <p style={{ margin: '2px 0', fontSize: '13px' }}>
                  Người kiểm tra: <strong>{selectedRefund.inspectedByName || `Admin #${selectedRefund.inspectedByUserId}`}</strong> lúc <strong>{formatDateTime(selectedRefund.inspectionStartedAt)}</strong>
                </p>
                {selectedRefund.inspectionPassed !== null && selectedRefund.inspectionPassed !== undefined && (
                  <p style={{ margin: '2px 0', fontSize: '13px' }}>
                    Kết quả: <strong style={{ color: selectedRefund.inspectionPassed ? '#10b981' : '#ef4444' }}>{selectedRefund.inspectionPassed ? 'Đạt' : 'Không đạt'}</strong>
                  </p>
                )}
                {selectedRefund.inspectionNote && (
                  <p style={{ margin: '2px 0', fontSize: '13px' }}>Ghi chú: {selectedRefund.inspectionNote}</p>
                )}
              </div>
            )}

            {selectedRefund.replacementTrackingCode && (
              <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '12px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Vận chuyển hàng thay thế</h4>
                <p style={{ margin: '2px 0', fontSize: '13px' }}>Nhà vận chuyển: <strong>{selectedRefund.replacementShippingProvider}</strong></p>
                <p style={{ margin: '2px 0', fontSize: '13px' }}>Mã vận đơn: <strong>{selectedRefund.replacementTrackingCode}</strong></p>
              </div>
            )}

            {selectedRefund.refundProcessedByUserId && (
              <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '12px' }}>
                <p style={{ margin: '2px 0', fontSize: '13px' }}>
                  Đã xử lý hoàn tiền bởi: <strong>{selectedRefund.refundProcessedByName || `Admin #${selectedRefund.refundProcessedByUserId}`}</strong> vào lúc <strong>{formatDateTime(selectedRefund.refundProcessedAt)}</strong>
                </p>
              </div>
            )}

            {/* ---- Actions per status ---- */}

            {['RETURN_REQUESTED', 'WAITING_EVIDENCE', 'UNDER_REVIEW', 'PENDING'].includes(selectedRefund.status) && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selectedRefund.status === 'WAITING_EVIDENCE' && (
                  <div style={{ padding: '10px 12px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '6px', fontSize: '13px', color: '#d97706' }}>
                    <strong>Đang chờ bằng chứng:</strong> Khách hàng chưa nộp bằng chứng (hoặc đang bổ sung). Yêu cầu sẽ tự động chuyển sang trạng thái <em>Đang xem xét (UNDER_REVIEW)</em> sau khi khách nộp bằng chứng thành công.
                  </div>
                )}
                {!showRejectInput ? (
                  <>
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Chọn hướng xử lý:</label>
                      <select
                        value={approveResolutionType}
                        onChange={(e) => setApproveResolutionType(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '13px' }}
                      >
                        <option value="">-- Chọn hướng xử lý --</option>
                        {Object.keys(RESOLUTION_LABELS).map((rt) => (
                          <option key={rt} value={rt} disabled={!RESOLUTION_ELIGIBILITY[rt](selectedRefund.reason)}>
                            {RESOLUTION_LABELS[rt]}{!RESOLUTION_ELIGIBILITY[rt](selectedRefund.reason) ? ' (không phù hợp với lý do này)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Textarea
                      placeholder="Ghi chú (không bắt buộc)..."
                      value={approveNote}
                      onChange={(e) => setApproveNote(e.target.value)}
                      rows={2}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                      <Button className="btn-secondary" style={{ background: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#dc2626', fontWeight: 600 }} onClick={() => setShowRejectInput(true)} disabled={processing}>
                        <XCircle size={16} style={{ marginRight: '4px' }} /> Từ chối
                      </Button>
                      <Button
                        style={{ background: selectedRefund.status === 'WAITING_EVIDENCE' ? '#9ca3af' : '#10b981', borderColor: selectedRefund.status === 'WAITING_EVIDENCE' ? '#9ca3af' : '#10b981', color: '#ffffff', fontWeight: 600 }}
                        onClick={() => handleApprove(selectedRefund.id)}
                        disabled={processing || selectedRefund.status === 'WAITING_EVIDENCE'}
                        title={selectedRefund.status === 'WAITING_EVIDENCE' ? 'Khách hàng cần nộp bằng chứng trước khi có thể duyệt' : undefined}
                      >
                        <CheckCircle size={16} style={{ marginRight: '4px' }} /> Duyệt yêu cầu
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="stack" style={{ gap: '10px' }}>
                    <Textarea
                      placeholder="Nhập lý do từ chối yêu cầu trả hàng..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={2}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                      <Button className="btn-secondary" onClick={() => setShowRejectInput(false)} disabled={processing}>Hủy</Button>
                      <Button style={{ background: '#dc2626', borderColor: '#dc2626', color: '#ffffff', fontWeight: 600 }} onClick={() => handleReject(selectedRefund.id)} disabled={processing}>
                        Xác nhận từ chối
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedRefund.status === 'PICKUP_PENDING' && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="primary" style={{ background: '#10b981', borderColor: '#10b981' }} onClick={() => handleConfirmReceived(selectedRefund.id)} disabled={processing}>
                  <CheckCircle size={16} style={{ marginRight: '4px' }} /> Xác nhận đã nhận hàng
                </Button>
              </div>
            )}

            {selectedRefund.status === 'RETURN_RECEIVED' && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="primary" onClick={() => handleStartInspection(selectedRefund.id)} disabled={processing}>
                  Bắt đầu kiểm tra hàng
                </Button>
              </div>
            )}

            {selectedRefund.status === 'INSPECTING' && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <Textarea
                  placeholder="Ghi chú kết quả kiểm tra (bắt buộc nếu không đạt)..."
                  value={inspectionNote}
                  onChange={(e) => setInspectionNote(e.target.value)}
                  rows={2}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <Button className="btn-secondary" style={{ background: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#dc2626', fontWeight: 600 }} onClick={() => handleCompleteInspection(selectedRefund.id, false)} disabled={processing}>
                    Không đạt
                  </Button>
                  <Button style={{ background: '#10b981', borderColor: '#10b981', color: '#ffffff', fontWeight: 600 }} onClick={() => handleCompleteInspection(selectedRefund.id, true)} disabled={processing}>
                    Đạt
                  </Button>
                </div>
              </div>
            )}

            {(selectedRefund.status === 'RESHIP_PENDING' || selectedRefund.status === 'EXCHANGE_SHIPPING') && (
              !selectedRefund.replacementTrackingCode ? (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input
                      value={replacementProvider}
                      onChange={(e) => setReplacementProvider(e.target.value)}
                      placeholder="Nhà vận chuyển"
                      style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '13px' }}
                    />
                    <input
                      value={replacementTrackingCode}
                      onChange={(e) => setReplacementTrackingCode(e.target.value)}
                      placeholder="Mã vận đơn"
                      style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '13px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button variant="primary" onClick={() => handleSubmitReplacement(selectedRefund.id)} disabled={processing}>
                      Lưu thông tin vận chuyển
                    </Button>
                  </div>
                </div>
              ) : (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                  <Button variant="primary" style={{ background: '#10b981', borderColor: '#10b981' }} onClick={() => handleClose(selectedRefund.id)} disabled={processing}>
                    <CheckCircle size={16} style={{ marginRight: '4px' }} /> Đóng yêu cầu
                  </Button>
                </div>
              )
            )}

            {selectedRefund.status === 'REFUND_PROCESSING' && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="primary" style={{ background: '#10b981', borderColor: '#10b981' }} onClick={() => handleMarkRefundProcessed(selectedRefund.id)} disabled={processing}>
                  <CheckCircle size={16} style={{ marginRight: '4px' }} /> Xác nhận đã chuyển tiền
                </Button>
              </div>
            )}

            {selectedRefund.status === 'REFUND_COMPLETED' && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="primary" onClick={() => handleClose(selectedRefund.id)} disabled={processing}>
                  Đóng yêu cầu
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </section>
  );
}
