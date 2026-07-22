import { useState, useEffect } from 'react';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Textarea from '../../components/ui/Textarea';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { showToast } from '../../utils/toast';
import { refundService } from '../../services/refundService';
import { RotateCcw, CheckCircle, XCircle, Eye } from 'lucide-react';

export default function AdminRefundsPage() {
  const [refunds, setRefunds] = useState([]);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [processing, setProcessing] = useState(false);

  const loadRefunds = async () => {
    const data = await refundService.getRefundRequests();
    setRefunds(data);
  };

  useEffect(() => {
    loadRefunds();
    const handleUpdate = () => loadRefunds();
    window.addEventListener('refund_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('refund_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const filtered = refunds.filter((r) => {
    if (filterStatus === 'ALL') return true;
    return r.status === filterStatus;
  });

  const handleApprove = async (id) => {
    setProcessing(true);
    try {
      await refundService.approveRefund(id);
      showToast('Đã chấp nhận hoàn tiền thành công!', 'success');
      setSelectedRefund(null);
      loadRefunds();
    } catch (e) {
      showToast('Có lỗi xảy ra', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (id) => {
    if (!rejectReason.trim()) {
      showToast('Vui lòng nhập lý do từ chối', 'error');
      return;
    }
    setProcessing(true);
    try {
      await refundService.rejectRefund(id, rejectReason.trim());
      showToast('Đã từ chối yêu cầu hoàn tiền.', 'info');
      setSelectedRefund(null);
      setShowRejectInput(false);
      setRejectReason('');
      loadRefunds();
    } catch (e) {
      showToast('Có lỗi xảy ra', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const columns = [
    { key: 'id', label: 'Mã yêu cầu' },
    { key: 'orderId', label: 'Đơn hàng', render: (row) => <strong>#{row.orderId}</strong> },
    { key: 'refundAmount', label: 'Số tiền hoàn', render: (row) => <strong style={{ color: '#ef4444' }}>{formatCurrency(row.refundAmount)}</strong> },
    { key: 'reason', label: 'Lý do' },
    { key: 'createdAt', label: 'Ngày yêu cầu', render: (row) => formatDateTime(row.createdAt) },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (row) => (
        <span className={`status-badge ${row.status === 'APPROVED' ? 'refunded' : row.status === 'REJECTED' ? 'cancelled' : 'refund-requested'}`}>
          {row.status === 'APPROVED' ? 'ĐÃ DUYỆT' : row.status === 'REJECTED' ? 'TỪ CHỐI' : 'CHỜ DUYỆT'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Thao tác',
      render: (row) => (
        <div className="admin-row-actions">
          <Button type="button" variant="secondary" size="sm" onClick={() => { setSelectedRefund(row); setShowRejectInput(false); setRejectReason(''); }}>
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
            <RotateCcw size={28} color="var(--accent)" /> Quản Lý Yêu Cầu Hoàn Tiền
          </h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--muted)', fontSize: '14px' }}>
            Xem xét và phê duyệt các yêu cầu trả hàng / hoàn tiền từ khách hàng
          </p>
        </div>
        <Button variant="primary" onClick={async () => {
          await refundService.createRefundRequest('DEBUG-' + Math.floor(Math.random() * 1000), {
            reason: 'WRONG_ITEM',
            description: 'Tạo tự động để test',
            bankName: 'Test Bank',
            accountNumber: '123456789',
            accountOwner: 'TEST USER',
            refundAmount: 50000,
          });
          showToast('Đã tạo mock data thành công!', 'success');
          loadRefunds();
        }}>
          + Tạo Mock Test
        </Button>
      </div>

      {/* Tabs Filter */}
      <div className="admin-filter-tabs">
        {[
          { id: 'ALL', label: 'Tất cả' },
          { id: 'PENDING', label: 'Chờ duyệt' },
          { id: 'APPROVED', label: 'Đã chấp nhận' },
          { id: 'REJECTED', label: 'Đã từ chối' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`admin-filter-tab ${filterStatus === tab.id ? 'is-active' : ''}`}
            onClick={() => setFilterStatus(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Table columns={columns} rows={filtered} emptyText="Chưa có yêu cầu hoàn tiền nào." />

      {/* Refund Detail Modal */}
      {selectedRefund && (
        <Modal isOpen={!!selectedRefund} onClose={() => setSelectedRefund(null)} title={`Chi tiết yêu cầu hoàn tiền - Đơn #${selectedRefund.orderId}`}>
          <div className="stack" style={{ gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'var(--surface-alt)', padding: '12px', borderRadius: '8px' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Lý do hoàn:</span>
                <p style={{ margin: '2px 0 0 0', fontWeight: 'bold' }}>{selectedRefund.reason}</p>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Số tiền yêu cầu hoàn:</span>
                <p style={{ margin: '2px 0 0 0', fontWeight: 'bold', color: '#ef4444' }}>{formatCurrency(selectedRefund.refundAmount)}</p>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Mô tả từ khách hàng:</span>
              <p style={{ margin: 0, background: 'var(--surface)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                {selectedRefund.description || 'Không có mô tả thêm.'}
              </p>
            </div>

            <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '12px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Thông tin tài khoản nhận tiền hoàn</h4>
              <p style={{ margin: '2px 0', fontSize: '13px' }}>Ngân hàng: <strong>{selectedRefund.bankName}</strong></p>
              <p style={{ margin: '2px 0', fontSize: '13px' }}>Số tài khoản: <strong>{selectedRefund.accountNumber}</strong></p>
              <p style={{ margin: '2px 0', fontSize: '13px' }}>Chủ tài khoản: <strong>{selectedRefund.accountOwner}</strong></p>
            </div>

            {selectedRefund.status === 'PENDING' && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {!showRejectInput ? (
                  <div className="admin-row-actions">
                    <Button type="button" variant="secondary" className="danger-action" onClick={() => setShowRejectInput(true)} disabled={processing}>
                      <XCircle size={16} /> Từ chối
                    </Button>
                    <Button type="button" variant="primary" onClick={() => handleApprove(selectedRefund.id)} disabled={processing}>
                      <CheckCircle size={16} /> Phê duyệt hoàn tiền
                    </Button>
                  </div>
                ) : (
                  <div className="stack" style={{ gap: '10px' }}>
                    <Textarea 
                      placeholder="Nhập lý do từ chối yêu cầu hoàn tiền..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={2}
                    />
                    <div className="admin-row-actions">
                      <Button type="button" variant="secondary" onClick={() => setShowRejectInput(false)} disabled={processing}>Hủy</Button>
                      <Button type="button" variant="primary" className="danger-action" onClick={() => handleReject(selectedRefund.id)} disabled={processing}>
                        Xác nhận từ chối
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}
    </section>
  );
}
