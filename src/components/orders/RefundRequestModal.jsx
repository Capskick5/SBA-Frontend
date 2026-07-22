import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import { formatCurrency } from '../../utils/formatters';
import { showToast } from '../../utils/toast';
import { refundService } from '../../services/refundService';
import { AlertCircle, X } from 'lucide-react';

const REASON_OPTIONS = [
  { value: 'BOOK_DEFECT', label: 'Sách bị lỗi (in ấn, đóng gáy, mất trang...)' },
  { value: 'WRONG_BOOK', label: 'Giao sai sách' },
  { value: 'DAMAGED_IN_TRANSIT', label: 'Sách bị hư hỏng do vận chuyển' },
];

const MIN_EVIDENCE_FILES = 2;

export default function RefundRequestModal({ order, isOpen, onClose, onSubmitSuccess }) {
  const [reason, setReason] = useState('BOOK_DEFECT');
  const [description, setDescription] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountOwner, setAccountOwner] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [quantities, setQuantities] = useState({});
  const [evidenceItems, setEvidenceItems] = useState([]);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [evidenceInputKey, setEvidenceInputKey] = useState(0);

  if (!isOpen || !order) return null;

  const items = order.items || [];
  const selectedAmount = items
    .filter((item) => quantities[item.id] > 0)
    .reduce((sum, item) => sum + item.unitPrice * quantities[item.id], 0);

  const toggleItem = (item) => {
    setQuantities((current) => {
      const next = { ...current };
      if (next[item.id] > 0) {
        delete next[item.id];
      } else {
        next[item.id] = item.quantity;
      }
      return next;
    });
  };

  const setItemQuantity = (item, quantity) => {
    const clamped = Math.min(Math.max(1, quantity), item.quantity);
    setQuantities((current) => ({ ...current, [item.id]: clamped }));
  };

  const handleEvidenceFilesSelected = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setEvidenceInputKey((key) => key + 1);
    setUploadingEvidence(true);
    for (const file of files) {
      const localId = `${Date.now()}-${file.name}-${Math.random()}`;
      setEvidenceItems((current) => [...current, { id: localId, name: file.name, url: null, error: false }]);
      try {
        const { url } = await refundService.uploadEvidenceFile(file);
        setEvidenceItems((current) => current.map((it) => (it.id === localId ? { ...it, url } : it)));
      } catch (err) {
        setEvidenceItems((current) => current.map((it) => (it.id === localId ? { ...it, error: true } : it)));
        showToast(err?.message || `Không thể tải lên "${file.name}"`, 'error');
      }
    }
    setUploadingEvidence(false);
  };

  const removeEvidenceItem = (id) => {
    setEvidenceItems((current) => current.filter((it) => it.id !== id));
  };

  const uploadedEvidenceUrls = evidenceItems.filter((it) => it.url).map((it) => it.url);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const selectedItems = Object.entries(quantities)
      .filter(([, quantity]) => quantity > 0)
      .map(([orderItemId, quantity]) => ({ orderItemId: Number(orderItemId), quantity }));
    if (selectedItems.length === 0) {
      showToast('Vui lòng chọn ít nhất một sản phẩm cần trả', 'error');
      return;
    }
    if (!bankName.trim() || !accountNumber.trim() || !accountOwner.trim()) {
      showToast('Vui lòng điền đầy đủ thông tin tài khoản ngân hàng để nhận tiền hoàn', 'error');
      return;
    }
    if (uploadingEvidence) {
      showToast('Vui lòng đợi tải lên bằng chứng hoàn tất', 'error');
      return;
    }
    if (uploadedEvidenceUrls.length < MIN_EVIDENCE_FILES) {
      showToast(`Vui lòng tải lên ít nhất ${MIN_EVIDENCE_FILES} hình ảnh/video làm bằng chứng`, 'error');
      return;
    }

    setSubmitting(true);
    try {
      await refundService.createRefundRequest(order.id, {
        items: selectedItems,
        reason,
        description,
        bankName,
        accountNumber,
        accountOwner,
        evidenceUrls: uploadedEvidenceUrls,
      });
      showToast('Gửi yêu cầu trả hàng thành công! CSKH sẽ xem xét yêu cầu của bạn sớm nhất có thể.', 'success');
      onSubmitSuccess?.();
      onClose();
    } catch (err) {
      showToast(err?.message || 'Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Yêu cầu hoàn tiền - Đơn hàng #${order.id}`}>
      <form onSubmit={handleSubmit} className="stack" style={{ gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '14px' }}>
            Chọn sản phẩm cần trả *
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px' }}>
            {items.map((item) => {
              const selectedQty = quantities[item.id] || 0;
              const isSelected = selectedQty > 0;
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px',
                    borderRadius: '6px',
                    background: isSelected ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleItem(item)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ flex: 1, fontSize: '13px', cursor: 'pointer' }} onClick={() => toggleItem(item)}>
                    {item.title} <span style={{ color: 'var(--muted)' }}>(đã mua x{item.quantity})</span>
                  </span>
                  {isSelected && item.quantity > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Số lượng trả:</span>
                      <input
                        type="number"
                        min={1}
                        max={item.quantity}
                        value={selectedQty}
                        onChange={(e) => setItemQuantity(item, Number(e.target.value))}
                        style={{ width: '48px', padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '13px' }}
                      />
                    </div>
                  )}
                  <strong style={{ fontSize: '13px', minWidth: '90px', textAlign: 'right' }}>
                    {formatCurrency(isSelected ? item.unitPrice * selectedQty : item.lineTotal)}
                  </strong>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
          <span>Số tiền dự kiến hoàn trả: <strong style={{ color: '#ef4444' }}>{formatCurrency(selectedAmount)}</strong></span>
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
            Bằng chứng (hình ảnh/video) * <span style={{ fontWeight: 400, color: 'var(--muted)' }}>— tối thiểu {MIN_EVIDENCE_FILES} tệp</span>
          </label>
          <input
            key={evidenceInputKey}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleEvidenceFilesSelected}
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '13px', width: '100%' }}
          />
          <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: 'var(--muted)' }}>
            Chấp nhận hình ảnh hoặc video, tối đa 20MB mỗi tệp. Bằng chứng giúp CSKH xét duyệt yêu cầu nhanh hơn.
          </p>
          {evidenceItems.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
              {evidenceItems.map((item) => (
                <div key={item.id} style={{ position: 'relative', width: '72px', height: '72px' }}>
                  {item.url ? (
                    <img src={item.url} alt={item.name} style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)' }} onError={(e) => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div style={{ width: '72px', height: '72px', borderRadius: '6px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: item.error ? '#ef4444' : 'var(--muted)', textAlign: 'center', padding: '4px' }}>
                      {item.error ? 'Lỗi tải lên' : 'Đang tải...'}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeEvidenceItem(item.id)}
                    style={{ position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px', borderRadius: '50%', border: 'none', background: '#ef4444', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    aria-label="Xóa tệp"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
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
