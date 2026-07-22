import { useCallback, useEffect, useState } from 'react';
import AdminPageHeader from '../../components/ui/AdminPageHeader';
import AdminPagination from '../../components/ui/AdminPagination';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Textarea from '../../components/ui/Textarea';
import { ErrorState, LoadingState } from '../../components/ui/State';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { showToast } from '../../utils/toast';
import { adminService } from '../../services/adminService';
import { CheckCircle, XCircle, Eye } from 'lucide-react';

const PAGE_SIZE = 10;

const REASON_LABELS = {
  BOOK_DEFECT: 'Sách bị lỗi',
  WRONG_BOOK: 'Giao sai sách',
  DAMAGED_IN_TRANSIT: 'Sách bị hư hỏng do vận chuyển',
};

function EvidenceThumbnail({ url }) {
  const [isVideo, setIsVideo] = useState(false);
  const style = { width: '96px', height: '96px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)' };
  return isVideo
    ? <video src={url} style={style} muted />
    : <img src={url} alt="Bằng chứng" style={style} onError={() => setIsVideo(true)} />;
}

const STATUS_TABS = [
  { id: 'ALL', label: 'Tất cả', statuses: [] },
  { id: 'PENDING_REVIEW', label: 'Chờ xử lý', statuses: ['UNDER_REVIEW'] },
  { id: 'IN_PROGRESS', label: 'Đang xử lý', statuses: ['PICKUP_PENDING', 'RETURN_RECEIVED', 'INSPECTING', 'REFUND_PROCESSING'] },
  { id: 'DONE', label: 'Hoàn tất', statuses: ['REFUND_COMPLETED', 'COMPLETED'] },
  { id: 'REJECTED', label: 'Từ chối', statuses: ['REJECTED'] },
];

const STATUS_META = {
  UNDER_REVIEW: { badgeClass: 'refund-requested', badgeLabel: 'ĐANG XEM XÉT' },
  REJECTED: { badgeClass: 'cancelled', badgeLabel: 'TỪ CHỐI' },
  PICKUP_PENDING: { badgeClass: 'refund-requested', badgeLabel: 'CHỜ NHẬN HÀNG' },
  RETURN_RECEIVED: { badgeClass: 'refund-requested', badgeLabel: 'ĐÃ NHẬN HÀNG' },
  INSPECTING: { badgeClass: 'refund-requested', badgeLabel: 'ĐANG KIỂM TRA' },
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
  const [approveNote, setApproveNote] = useState('');
  const [inspectionNote, setInspectionNote] = useState('');
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
    setApproveNote('');
    setInspectionNote('');
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
    runAction(
      () => adminService.approveRefundRequest(id, { note: approveNote.trim() || undefined }),
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
    <section className="stack">
      <AdminPageHeader
        title="Yêu cầu hoàn hàng / hoàn tiền"
        subtitle={`${totalItems} yêu cầu · Duyệt và xử lý trả hàng / hoàn tiền từ khách.`}
      />

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
            <div className="admin-info-grid">
              <div>
                <span className="admin-info-label">Lý do trả hàng:</span>
                <p className="admin-info-value">{REASON_LABELS[selectedRefund.reason] || selectedRefund.reason}</p>
              </div>
              <div>
                <span className="admin-info-label">Số tiền yêu cầu hoàn:</span>
                <p className="admin-info-value is-danger">{formatCurrency(selectedRefund.requestedAmount)}</p>
              </div>
            </div>

            {selectedRefund.items?.length > 0 && (
              <div>
                <span className="admin-info-label">Sản phẩm yêu cầu trả:</span>
                <div className="admin-panel-box" style={{ padding: 0 }}>
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
              <span className="admin-info-label">Mô tả từ khách hàng:</span>
              <p className="admin-panel-box" style={{ margin: 0 }}>
                {selectedRefund.description || 'Không có mô tả thêm.'}
              </p>
            </div>

            {selectedRefund.evidence?.length > 0 && (
              <div>
                <span className="admin-info-label">Bằng chứng đã nộp:</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {selectedRefund.evidence.map((ev) => (
                    <a key={ev.id} href={ev.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
                      <EvidenceThumbnail url={ev.url} />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="admin-panel-box">
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Thông tin tài khoản nhận tiền hoàn</h4>
              <p style={{ margin: '2px 0', fontSize: '13px' }}>Ngân hàng: <strong>{selectedRefund.bankName}</strong></p>
              <p style={{ margin: '2px 0', fontSize: '13px' }}>Số tài khoản: <strong>{selectedRefund.bankAccountNumber}</strong></p>
              <p style={{ margin: '2px 0', fontSize: '13px' }}>Chủ tài khoản: <strong>{selectedRefund.bankAccountHolder}</strong></p>
            </div>

            {selectedRefund.decidedByUserId && (
              <div className="admin-panel-box">
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Quyết định xét duyệt</h4>
                <p style={{ margin: '2px 0', fontSize: '13px' }}>
                  Xử lý bởi: <strong>{selectedRefund.decidedByName || `Admin #${selectedRefund.decidedByUserId}`}</strong> vào lúc <strong>{formatDateTime(selectedRefund.decidedAt)}</strong>
                </p>
                {selectedRefund.decisionNote && (
                  <p style={{ margin: '6px 0 0 0', fontSize: '13px' }} className={selectedRefund.status === 'REJECTED' ? 'admin-status-bad' : 'admin-status-muted'}>
                    Ghi chú: {selectedRefund.decisionNote}
                  </p>
                )}
              </div>
            )}

            {selectedRefund.returnTrackingCode && (
              <div className="admin-panel-box">
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Vận chuyển trả hàng (khách gửi về)</h4>
                <p style={{ margin: '2px 0', fontSize: '13px' }}>Nhà vận chuyển: <strong>{selectedRefund.returnShippingProvider}</strong></p>
                <p style={{ margin: '2px 0', fontSize: '13px' }}>Mã vận đơn: <strong>{selectedRefund.returnTrackingCode}</strong></p>
                <p style={{ margin: '2px 0', fontSize: '13px' }}>Khách gửi lúc: <strong>{formatDateTime(selectedRefund.returnShippedAt)}</strong></p>
              </div>
            )}

            {selectedRefund.receivedByUserId && (
              <div className="admin-panel-box">
                <p style={{ margin: '2px 0', fontSize: '13px' }}>
                  Đã nhận hàng bởi: <strong>{selectedRefund.receivedByName || `Admin #${selectedRefund.receivedByUserId}`}</strong> vào lúc <strong>{formatDateTime(selectedRefund.receivedAt)}</strong>
                </p>
              </div>
            )}

            {selectedRefund.inspectedByUserId && (
              <div className="admin-panel-box">
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Kiểm tra kho</h4>
                <p style={{ margin: '2px 0', fontSize: '13px' }}>
                  Người kiểm tra: <strong>{selectedRefund.inspectedByName || `Admin #${selectedRefund.inspectedByUserId}`}</strong> lúc <strong>{formatDateTime(selectedRefund.inspectionStartedAt)}</strong>
                </p>
                {selectedRefund.inspectionPassed !== null && selectedRefund.inspectionPassed !== undefined && (
                  <p style={{ margin: '2px 0', fontSize: '13px' }}>
                    Kết quả:{' '}
                    <strong className={selectedRefund.inspectionPassed ? 'admin-status-ok' : 'admin-status-bad'}>
                      {selectedRefund.inspectionPassed ? 'Đạt' : 'Không đạt'}
                    </strong>
                  </p>
                )}
                {selectedRefund.inspectionNote && (
                  <p style={{ margin: '2px 0', fontSize: '13px' }}>Ghi chú: {selectedRefund.inspectionNote}</p>
                )}
              </div>
            )}

            {selectedRefund.refundProcessedByUserId && (
              <div className="admin-panel-box">
                <p style={{ margin: '2px 0', fontSize: '13px' }}>
                  Đã xử lý hoàn tiền bởi: <strong>{selectedRefund.refundProcessedByName || `Admin #${selectedRefund.refundProcessedByUserId}`}</strong> vào lúc <strong>{formatDateTime(selectedRefund.refundProcessedAt)}</strong>
                </p>
              </div>
            )}

            {/* ---- Actions per status ---- */}

            {selectedRefund.status === 'UNDER_REVIEW' && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {!showRejectInput ? (
                  <>
                    <Textarea
                      placeholder="Ghi chú (không bắt buộc)..."
                      value={approveNote}
                      onChange={(e) => setApproveNote(e.target.value)}
                      rows={2}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                      <Button variant="secondary" style={{ background: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#dc2626', fontWeight: 600 }} onClick={() => setShowRejectInput(true)} disabled={processing}>
                        <XCircle size={16} style={{ marginRight: '4px' }} /> Từ chối
                      </Button>
                      <Button
                        style={{ background: '#10b981', borderColor: '#10b981', color: '#ffffff', fontWeight: 600 }}
                        onClick={() => handleApprove(selectedRefund.id)}
                        disabled={processing}
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
                      <Button variant="secondary" onClick={() => setShowRejectInput(false)} disabled={processing}>Hủy</Button>
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
                  <Button variant="secondary" style={{ background: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#dc2626', fontWeight: 600 }} onClick={() => handleCompleteInspection(selectedRefund.id, false)} disabled={processing}>
                    Không đạt
                  </Button>
                  <Button style={{ background: '#10b981', borderColor: '#10b981', color: '#ffffff', fontWeight: 600 }} onClick={() => handleCompleteInspection(selectedRefund.id, true)} disabled={processing}>
                    Đạt
                  </Button>
                </div>
              </div>
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
