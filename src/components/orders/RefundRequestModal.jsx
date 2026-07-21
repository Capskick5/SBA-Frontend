import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import { formatCurrency } from '../../utils/formatters';
import { showToast } from '../../utils/toast';
import { refundService } from '../../services/refundService';
import { Upload, AlertCircle } from 'lucide-react';

const REASON_OPTIONS = [
  { value: 'DAMAGED', label: 'Sản phẩm bị hư hỏng / rách' },
  { value: 'WRONG_ITEM', label: 'Giao sai sản phẩm / thiếu sách' },
  { value: 'DEFECTIVE', label: 'Lỗi in ấn (mất trang, mờ nét)' },
  { value: 'NOT_AS_DESCRIBED', label: 'Không giống mô tả' },
  { value: 'OTHER', label: 'Lý do khác' },
];

export default function RefundRequestModal({ order, isOpen, onClose, onSubmitSuccess }) {
  const [reason, setReason] = useState('DAMAGED');
  const [description, setDescription] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountOwner, setAccountOwner] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mockProofUrl, setMockProofUrl] = useState('');

  if (!isOpen || !order) return null;

  const totalAmount = order.total || order.subtotal || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bankName.trim() || !accountNumber.trim() || !accountOwner.trim()) {
      showToast('Vui lòng điền đầy đủ thông tin tài khoản ngân hàng để nhận tiền hoàn', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await refundService.createRefundRequest(order.id, {
        reason,
        description,
        bankName,
        accountNumber,
        accountOwner,
        refundAmount: totalAmount,
        proofImages: mockProofUrl ? [mockProofUrl] : [],
        items: order.items || [],
      });
      showToast('Gửi yêu cầu hoàn tiền thành công! Admin sẽ xem xét sớm.', 'success');
      onSubmitSuccess?.();
      onClose();
    } catch (err) {
      showToast('Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Yêu cầu hoàn tiền - Đơn hàng #${order.id}`}>
      <form onSubmit={handleSubmit} className="stack" style={{ gap: '16px' }}>
        <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
          <span>Số tiền dự kiến hoàn trả: <strong style={{ color: '#ef4444' }}>{formatCurrency(totalAmount)}</strong></span>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '14px' }}>
            Lý do hoàn hàng / hoàn tiền *
          </label>
          <select 
            value={reason} 
            onChange={(e) => setReason(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: '14px'
            }}
          >
            {REASON_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '14px' }}>
            Chi tiết lý do & tình trạng sản phẩm
          </label>
          <Textarea 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả cụ thể vấn đề bạn gặp phải với sản phẩm..."
            rows={3}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '14px' }}>
            Hình ảnh minh chứng (URL hoặc đính kèm)
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Input 
              value={mockProofUrl}
              onChange={(e) => setMockProofUrl(e.target.value)}
              placeholder="Dán URL hình ảnh lỗi (nếu có)..."
            />
          </div>
        </div>

        <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '16px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>Thông tin tài khoản nhận tiền hoàn</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Ngân hàng *</label>
              <Input 
                value={bankName} 
                onChange={(e) => setBankName(e.target.value)} 
                placeholder="VD: Vietcombank, MBBank..."
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Số tài khoản *</label>
              <Input 
                value={accountNumber} 
                onChange={(e) => setAccountNumber(e.target.value)} 
                placeholder="Nhập số tài khoản"
                required
              />
            </div>
          </div>
          <div style={{ marginTop: '10px' }}>
            <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Tên chủ tài khoản (viết hoa không dấu) *</label>
            <Input 
              value={accountOwner} 
              onChange={(e) => setAccountOwner(e.target.value)} 
              placeholder="VD: NGUYEN VAN A"
              required
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Đang gửi...' : 'Gửi yêu cầu hoàn tiền'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
