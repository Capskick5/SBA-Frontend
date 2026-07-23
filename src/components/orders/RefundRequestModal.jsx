import { useState, useRef } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import { formatCurrency } from '../../utils/formatters';
import { showToast } from '../../utils/toast';
import { refundService } from '../../services/refundService';
import {
  AlertCircle,
  Building2,
  CreditCard,
  Film,
  Minus,
  Plus,
  UploadCloud,
  User,
  X,
} from 'lucide-react';

const REASON_OPTIONS = [
  { value: 'BOOK_DEFECT', label: 'Sách bị lỗi (in ấn, đóng gáy, mất trang...)' },
  { value: 'WRONG_BOOK', label: 'Giao sai sách' },
  { value: 'DAMAGED_IN_TRANSIT', label: 'Sách bị hư hỏng do vận chuyển' },
];

const MIN_EVIDENCE_FILES = 2;

function getItemCover(item) {
  return item.coverUrl || item.imageUrl || `https://placehold.co/120x170?text=${encodeURIComponent(item.title || 'Sách')}`;
}

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
  const fileInputRef = useRef(null);

  if (!isOpen || !order) return null;

  const items = order.items || [];
  const selectedItemsList = items.filter((item) => quantities[item.id] > 0);
  const selectedAmount = selectedItemsList.reduce(
    (sum, item) => sum + item.unitPrice * quantities[item.id],
    0
  );

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

  const updateQuantity = (item, delta) => {
    setQuantities((current) => {
      const currentQty = current[item.id] || 1;
      const nextQty = Math.min(Math.max(1, currentQty + delta), item.quantity);
      return { ...current, [item.id]: nextQty };
    });
  };

  const handleEvidenceFilesSelected = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setEvidenceInputKey((key) => key + 1);
    setUploadingEvidence(true);
    for (const file of files) {
      const localId = `${Date.now()}-${file.name}-${Math.random()}`;
      const isVideo = file.type.startsWith('video/');
      setEvidenceItems((current) => [
        ...current,
        { id: localId, name: file.name, url: null, isVideo, error: false },
      ]);
      try {
        const { url } = await refundService.uploadEvidenceFile(file);
        setEvidenceItems((current) =>
          current.map((it) => (it.id === localId ? { ...it, url } : it))
        );
      } catch (err) {
        setEvidenceItems((current) =>
          current.map((it) => (it.id === localId ? { ...it, error: true } : it))
        );
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
    <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="640px">
      <div className="refund-modal-container">
        {/* Custom Header */}
        <div className="refund-modal-header">
          <div className="refund-header-title-box">
            <h2>Yêu cầu hoàn tiền</h2>
            <span className="refund-order-badge">Đơn hàng #{order.id}</span>
          </div>
          <button type="button" className="refund-modal-close-btn" onClick={onClose} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="refund-modal-form">
          {/* Section 1: Item Selection */}
          <div className="refund-form-section">
            <label className="refund-section-label">
              Chọn sản phẩm cần trả <span className="req-star">*</span>
            </label>
            <div className="refund-items-grid">
              {items.map((item) => {
                const selectedQty = quantities[item.id] || 0;
                const isSelected = selectedQty > 0;
                return (
                  <div
                    key={item.id}
                    className={`refund-item-card ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => toggleItem(item)}
                  >
                    <div className="refund-checkbox-wrapper">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        onClick={(e) => e.stopPropagation()}
                        tabIndex={-1}
                      />
                    </div>
                    <div className="refund-item-cover-wrapper">
                      <img
                        src={getItemCover(item)}
                        alt={item.title}
                        onError={(e) => {
                          e.target.src = `https://placehold.co/120x170?text=${encodeURIComponent(item.title || 'Sách')}`;
                        }}
                      />
                    </div>
                    <div className="refund-item-info">
                      <h4 className="refund-item-title">{item.title}</h4>
                      <div className="refund-item-meta">
                        <span className="refund-item-price">{formatCurrency(item.unitPrice)} / cuốn</span>
                        <span className="refund-item-purchased">(Đã mua x{item.quantity})</span>
                      </div>
                    </div>

                    {isSelected ? (
                      <div className="refund-item-right" onClick={(e) => e.stopPropagation()}>
                        {item.quantity > 1 && (
                          <div className="refund-qty-counter">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item, -1)}
                              disabled={selectedQty <= 1}
                              aria-label="Giảm"
                            >
                              <Minus size={12} />
                            </button>
                            <span>{selectedQty}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item, 1)}
                              disabled={selectedQty >= item.quantity}
                              aria-label="Tăng"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        )}
                        <strong className="refund-item-line-total">
                          {formatCurrency(item.unitPrice * selectedQty)}
                        </strong>
                      </div>
                    ) : (
                      <div className="refund-item-right">
                        <span className="refund-item-unselected-label">Bấm để chọn</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Refund Amount Summary Banner */}
          <div className="refund-summary-banner">
            <div className="refund-summary-text">
              <span className="refund-summary-label">Số tiền dự kiến hoàn trả:</span>
              <strong className="refund-summary-amount">{formatCurrency(selectedAmount)}</strong>
            </div>
            {selectedItemsList.length > 0 && (
              <span className="refund-summary-badge">{selectedItemsList.length} sản phẩm</span>
            )}
          </div>

          {/* Section 2: Reason & Description */}
          <div className="refund-form-group">
            <label className="refund-section-label">
              Lý do hoàn hàng / hoàn tiền <span className="req-star">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="refund-select-input"
            >
              {REASON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="refund-form-group">
            <label className="refund-section-label">
              Chi tiết lý do & tình trạng sản phẩm
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả cụ thể vấn đề gặp phải (ví dụ: gáy sách bung, thiếu trang từ 45-60, trầy xước...)"
              rows={3}
            />
          </div>

          {/* Section 3: Evidence Upload */}
          <div className="refund-form-group">
            <label className="refund-section-label">
              Bằng chứng (hình ảnh/video) <span className="req-star">*</span>
              <span className="refund-label-hint">— Tối thiểu {MIN_EVIDENCE_FILES} tệp</span>
            </label>

            <input
              ref={fileInputRef}
              key={evidenceInputKey}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleEvidenceFilesSelected}
              style={{ display: 'none' }}
            />

            <div
              className="refund-upload-dropzone"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="refund-upload-icon-box">
                <UploadCloud size={24} />
              </div>
              <div>
                <p className="refund-upload-title">Nhấp để tải ảnh hoặc video bằng chứng</p>
                <p className="refund-upload-desc">
                  Chấp nhận PNG, JPG, MP4 (Tối đa 20MB mỗi tệp). Bằng chứng rõ ràng giúp duyệt đơn nhanh hơn.
                </p>
              </div>
            </div>

            {evidenceItems.length > 0 && (
              <div className="refund-evidence-previews">
                {evidenceItems.map((item) => (
                  <div key={item.id} className="refund-evidence-thumb">
                    {item.url ? (
                      item.isVideo ? (
                        <div className="refund-video-preview">
                          <Film size={24} />
                          <span>Video</span>
                        </div>
                      ) : (
                        <img src={item.url} alt={item.name} />
                      )
                    ) : (
                      <div className={`refund-thumb-status ${item.error ? 'is-error' : ''}`}>
                        {item.error ? 'Lỗi' : 'Đang tải...'}
                      </div>
                    )}
                    <button
                      type="button"
                      className="refund-thumb-remove"
                      onClick={() => removeEvidenceItem(item.id)}
                      title="Xóa tệp"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Bank Account Info */}
          <div className="refund-bank-section">
            <h4 className="refund-bank-title">Thông tin tài khoản nhận tiền hoàn</h4>
            <div className="refund-bank-grid">
              <div className="refund-form-group">
                <label className="refund-input-label">
                  <Building2 size={14} /> Ngân hàng <span className="req-star">*</span>
                </label>
                <Input
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="VD: Vietcombank, MBBank..."
                  required
                />
              </div>

              <div className="refund-form-group">
                <label className="refund-input-label">
                  <CreditCard size={14} /> Số tài khoản <span className="req-star">*</span>
                </label>
                <Input
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Nhập số tài khoản ngân hàng"
                  required
                />
              </div>
            </div>

            <div className="refund-form-group" style={{ marginTop: '12px' }}>
              <label className="refund-input-label">
                <User size={14} /> Tên chủ tài khoản (viết hoa không dấu) <span className="req-star">*</span>
              </label>
              <Input
                value={accountOwner}
                onChange={(e) => setAccountOwner(e.target.value)}
                placeholder="VD: NGUYEN VAN A"
                required
              />
            </div>
          </div>

          {/* Sticky Modal Actions Footer */}
          <div className="refund-modal-footer">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu hoàn tiền'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
