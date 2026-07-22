import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Table from '../../components/ui/Table';
import { ErrorState, LoadingState } from '../../components/ui/State';
import { adminService } from '../../services/adminService';
import {
  createGiftWrap,
  deleteGiftWrap,
  isGiftWrapsMockMode,
  listGiftWrapsAdmin,
  setGiftWrapActive,
  updateGiftWrap,
} from '../../services/adminConfigService';
import { formatCurrency } from '../../utils/formatters';
import { showToast } from '../../utils/toast';

const EMPTY_FORM = {
  name: '',
  feeVnd: '',
  displayOrder: '0',
  active: true,
  imageKey: '',
};

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

export default function AdminGiftWrapsPage() {
  const [giftWraps, setGiftWraps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [usingMockGiftWraps, setUsingMockGiftWraps] = useState(false);

  useEffect(() => {
    let active = true;
    listGiftWrapsAdmin()
      .then(({ items, usingMock }) => {
        if (!active) return;
        setGiftWraps(Array.isArray(items) ? items : []);
        setUsingMockGiftWraps(usingMock || isGiftWrapsMockMode());
        if (usingMock) setError('');
      })
      .catch((err) => {
        if (!active) return;
        setGiftWraps([]);
        setError(getErrorMessage(err, 'Không thể tải tùy chọn giấy gói quà.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const reloadGiftWraps = () => {
    setLoading(true);
    setError('');
    setReloadKey((key) => key + 1);
  };

  const setField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setImagePreviewUrl('');
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (giftWrap) => {
    setEditingId(giftWrap.id);
    setForm({
      name: giftWrap.name || '',
      feeVnd: String(giftWrap.feeVnd ?? ''),
      displayOrder: String(giftWrap.displayOrder ?? 0),
      active: Boolean(giftWrap.active),
      imageKey: giftWrap.imageKey || '',
    });
    setImagePreviewUrl(giftWrap.imageUrl || '');
    setFormError('');
    setFormOpen(true);
  };

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await adminService.uploadThumbnail(formData);
      const key = res.data?.data?.coverKey || res.data?.coverKey;
      if (!key) throw new Error('Invalid upload response');
      setField('imageKey', key);
      setImagePreviewUrl(URL.createObjectURL(file));
    } catch (err) {
      showToast(getErrorMessage(err, 'Không thể tải ảnh giấy gói quà lên.'), 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const submitGiftWrap = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setFormError('Nhập tên giấy gói quà.');
      return;
    }
    if (!form.imageKey) {
      setFormError('Tải ảnh giấy gói quà lên.');
      return;
    }
    const feeVnd = Number(form.feeVnd);
    if (!Number.isFinite(feeVnd) || feeVnd < 0) {
      setFormError('Phí phải là số không âm.');
      return;
    }
    const displayOrder = Number(form.displayOrder);
    if (!Number.isFinite(displayOrder)) {
      setFormError('Thứ tự hiển thị phải là số.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    const payload = {
      name: form.name.trim(),
      imageKey: form.imageKey,
      feeVnd,
      displayOrder,
      active: form.active,
    };

    try {
      if (editingId) {
        await updateGiftWrap(editingId, payload, { imageUrl: imagePreviewUrl });
        showToast('Đã cập nhật giấy gói quà.');
      } else {
        await createGiftWrap(payload, { imageUrl: imagePreviewUrl });
        showToast('Đã tạo giấy gói quà.');
      }
      setFormOpen(false);
      reloadGiftWraps();
    } catch (err) {
      setFormError(getErrorMessage(err, 'Không thể lưu giấy gói quà này.'));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (giftWrap) => {
    try {
      await setGiftWrapActive(giftWrap.id, !giftWrap.active);
      showToast(giftWrap.active ? 'Đã tắt giấy gói quà.' : 'Đã bật giấy gói quà.');
      reloadGiftWraps();
    } catch (err) {
      showToast(getErrorMessage(err, 'Không thể cập nhật trạng thái giấy gói quà.'), 'error');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteGiftWrap(deleteTarget.id);
      showToast('Đã xóa giấy gói quà.');
      setDeleteTarget(null);
      reloadGiftWraps();
    } catch (err) {
      showToast(getErrorMessage(err, 'Không thể xóa giấy gói quà này. Nếu đã được dùng trong đơn hàng, hãy tắt thay vì xóa.'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: 'imageUrl',
      label: 'Xem trước',
      render: (giftWrap) => (
        <div className="banner-thumb-cell">
          {giftWrap.imageUrl ? (
            <img src={giftWrap.imageUrl} alt={giftWrap.name} />
          ) : (
            <span className="muted">Chưa có ảnh</span>
          )}
        </div>
      ),
    },
    { key: 'name', label: 'Tên' },
    { key: 'feeVnd', label: 'Phí', render: (giftWrap) => formatCurrency(giftWrap.feeVnd) },
    { key: 'displayOrder', label: 'Thứ tự' },
    {
      key: 'active',
      label: 'Trạng thái',
      render: (giftWrap) => (
        <span className={`status-badge ${giftWrap.active ? 'delivered' : 'unknown'}`}>
          {giftWrap.active ? 'Đang hiện' : 'Không hoạt động'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Thao tác',
      render: (giftWrap) => (
        <div className="banner-row-actions">
          <Button type="button" className="btn-secondary" onClick={() => openEdit(giftWrap)}>
            Sửa
          </Button>
          <Button type="button" className="btn-secondary" onClick={() => toggleActive(giftWrap)}>
            {giftWrap.active ? 'Tắt' : 'Bật'}
          </Button>
          <Button type="button" className="btn-secondary danger-action" onClick={() => setDeleteTarget(giftWrap)}>
            <Trash2 size={15} /> Xóa
          </Button>
        </div>
      ),
    },
  ];

  return (
    <section className="stack">
      <header className="admin-banners-header">
        <div>
          <h1>Giấy gói quà</h1>
          <p>Cấu hình tùy chọn giấy gói quà và phí hiển thị khi thanh toán.</p>
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus size={17} /> Thêm giấy gói quà
        </Button>
      </header>

      <div className="admin-banners-subheader">
        <h2>Tùy chọn giấy gói quà</h2>
        {usingMockGiftWraps && (
          <span className="status-badge unknown">Dữ liệu mẫu ngoại tuyến</span>
        )}
      </div>

      {loading ? (
        <LoadingState text="Đang tải giấy gói quà..." />
      ) : error ? (
        <ErrorState text={error}>
          <Button type="button" onClick={reloadGiftWraps}>Thử lại</Button>
        </ErrorState>
      ) : (
        <Table columns={columns} rows={giftWraps} emptyText="Chưa có tùy chọn giấy gói quà nào. Thêm một tùy chọn để khách hàng chọn khi thanh toán." />
      )}

      {formOpen && (
        <Modal title={editingId ? 'Sửa giấy gói quà' : 'Thêm giấy gói quà'} onClose={() => setFormOpen(false)}>
          <form className="form" onSubmit={submitGiftWrap}>
            {formError && <p className="form-message form-message-error">{formError}</p>}

            <div className="field">
              <span>Ảnh giấy gói quà</span>
              <input type="file" accept="image/*" onChange={handleImageChange} />
              {uploadingImage && <p className="muted">Đang tải lên...</p>}
              {imagePreviewUrl && (
                <div className="banner-thumb-cell banner-form-preview">
                  <img src={imagePreviewUrl} alt="Xem trước giấy gói quà" />
                </div>
              )}
            </div>

            <Input
              label="Tên"
              value={form.name}
              onChange={(event) => setField('name', event.target.value)}
              placeholder="vd. Giấy hoa văn đỏ"
              required
            />
            <Input
              label="Phí (VND)"
              type="number"
              min="0"
              step="1000"
              value={form.feeVnd}
              onChange={(event) => setField('feeVnd', event.target.value)}
              required
            />
            <Input
              label="Thứ tự hiển thị"
              type="number"
              value={form.displayOrder}
              onChange={(event) => setField('displayOrder', event.target.value)}
            />
            <label className="banner-active-check">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => setField('active', event.target.checked)}
              />
              <span>Hiển thị tùy chọn giấy gói quà này khi thanh toán</span>
            </label>

            <div className="confirm-dialog-actions">
              <Button type="button" className="btn-secondary" onClick={() => setFormOpen(false)} disabled={submitting}>
                Hủy
              </Button>
              <Button type="submit" loading={submitting} disabled={uploadingImage}>
                {editingId ? 'Lưu thay đổi' : 'Tạo giấy gói quà'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Xóa giấy gói quà?" onClose={() => setDeleteTarget(null)} hideClose={deleting}>
          <div className="stack">
            <p>
              <strong>{deleteTarget.name}</strong> sẽ bị xóa vĩnh viễn khỏi tùy chọn thanh toán.
            </p>
            <div className="confirm-dialog-actions">
              <Button type="button" className="btn-secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Hủy
              </Button>
              <Button type="button" className="danger-action" onClick={confirmDelete} loading={deleting}>
                Xóa giấy gói quà
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
