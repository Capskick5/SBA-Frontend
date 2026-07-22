import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Table from '../../components/ui/Table';
import AdminPageHeader from '../../components/ui/AdminPageHeader';
import { ErrorState, LoadingState } from '../../components/ui/State';
import { adminService } from '../../services/adminService';
import {
  createBanner,
  deleteBanner,
  isBannersMockMode,
  listBannersAdmin,
  setBannerActive,
  updateBanner,
} from '../../services/adminConfigService';
import { showToast } from '../../utils/toast';

const EMPTY_FORM = {
  title: '',
  subtitle: '',
  linkUrl: '',
  displayOrder: '0',
  active: true,
  imageKey: '',
};

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

export default function AdminBannersPage() {
  const [banners, setBanners] = useState([]);
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
  const [usingMockBanners, setUsingMockBanners] = useState(false);

  useEffect(() => {
    let active = true;
    listBannersAdmin()
      .then(({ items, usingMock }) => {
        if (!active) return;
        setBanners(Array.isArray(items) ? items : []);
        setUsingMockBanners(usingMock || isBannersMockMode());
        if (usingMock) setError('');
      })
      .catch((err) => {
        if (!active) return;
        setBanners([]);
        setError(getErrorMessage(err, 'Không thể tải banner.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const reloadBanners = () => {
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

  const openEdit = (banner) => {
    setEditingId(banner.id);
    setForm({
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      linkUrl: banner.linkUrl || '',
      displayOrder: String(banner.displayOrder ?? 0),
      active: Boolean(banner.active),
      imageKey: banner.imageKey || '',
    });
    setImagePreviewUrl(banner.imageUrl || '');
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
      showToast(getErrorMessage(err, 'Không thể tải ảnh banner lên.'), 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const submitBanner = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setFormError('Nhập tiêu đề banner.');
      return;
    }
    if (!form.imageKey) {
      setFormError('Tải ảnh banner lên.');
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
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      imageKey: form.imageKey,
      linkUrl: form.linkUrl.trim() || null,
      displayOrder,
      active: form.active,
    };

    try {
      if (editingId) {
        await updateBanner(editingId, payload, { imageUrl: imagePreviewUrl });
        showToast('Đã cập nhật banner.');
      } else {
        await createBanner(payload, { imageUrl: imagePreviewUrl });
        showToast('Đã tạo banner.');
      }
      setFormOpen(false);
      reloadBanners();
    } catch (err) {
      setFormError(getErrorMessage(err, 'Không thể lưu banner này.'));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (banner) => {
    try {
      await setBannerActive(banner.id, !banner.active);
      showToast(banner.active ? 'Đã tắt banner.' : 'Đã bật banner.');
      reloadBanners();
    } catch (err) {
      showToast(getErrorMessage(err, 'Không thể cập nhật trạng thái banner.'), 'error');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteBanner(deleteTarget.id);
      showToast('Đã xóa banner.');
      setDeleteTarget(null);
      reloadBanners();
    } catch (err) {
      showToast(getErrorMessage(err, 'Không thể xóa banner này.'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: 'imageUrl',
      label: 'Xem trước',
      render: (banner) => (
        <div className="banner-thumb-cell">
          {banner.imageUrl ? (
            <img src={banner.imageUrl} alt={banner.title} />
          ) : (
            <span className="muted">Chưa có ảnh</span>
          )}
        </div>
      ),
    },
    { key: 'title', label: 'Tiêu đề' },
    { key: 'subtitle', label: 'Phụ đề', render: (banner) => banner.subtitle || '-' },
    { key: 'displayOrder', label: 'Thứ tự' },
    {
      key: 'active',
      label: 'Trạng thái',
      render: (banner) => (
        <span className={`status-badge ${banner.active ? 'delivered' : 'unknown'}`}>
          {banner.active ? 'Đang hiện' : 'Không hoạt động'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Thao tác',
      render: (banner) => (
        <div className="admin-row-actions">
          <Button type="button" variant="secondary" size="sm" onClick={() => openEdit(banner)}>
            Sửa
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => toggleActive(banner)}>
            {banner.active ? 'Tắt' : 'Bật'}
          </Button>
          <Button type="button" variant="secondary" size="sm" className="danger-action" onClick={() => setDeleteTarget(banner)}>
            <Trash2 size={15} /> Xóa
          </Button>
        </div>
      ),
    },
  ];

  return (
    <section className="stack">
      <AdminPageHeader
        title="Quản lý banner"
        subtitle="Cấu hình banner trang chủ."
        actions={(
          <Button type="button" onClick={openCreate}>
            <Plus size={17} /> Thêm banner
          </Button>
        )}
      >
        {usingMockBanners ? (
          <span className="status-badge unknown">Dữ liệu mẫu ngoại tuyến</span>
        ) : null}
      </AdminPageHeader>

      {loading ? (
        <LoadingState text="Đang tải banner..." />
      ) : error ? (
        <ErrorState text={error}>
          <Button type="button" onClick={reloadBanners}>Thử lại</Button>
        </ErrorState>
      ) : (
        <Table columns={columns} rows={banners} emptyText="Chưa có banner nào. Thêm banner để hiển thị trên trang chủ." />
      )}

      {formOpen && (
        <Modal title={editingId ? 'Sửa banner' : 'Thêm banner'} onClose={() => setFormOpen(false)}>
          <form className="form" onSubmit={submitBanner}>
            {formError && <p className="form-message form-message-error">{formError}</p>}

            <div className="field">
              <span>Ảnh banner</span>
              <input type="file" accept="image/*" onChange={handleImageChange} />
              {uploadingImage && <p className="muted">Đang tải lên...</p>}
              {imagePreviewUrl && (
                <div className="banner-thumb-cell banner-form-preview">
                  <img src={imagePreviewUrl} alt="Xem trước banner" />
                </div>
              )}
            </div>

            <Input
              label="Tiêu đề"
              value={form.title}
              onChange={(event) => setField('title', event.target.value)}
              placeholder="vd. Khám phá BookVerse"
              required
            />
            <Input
              label="Phụ đề"
              value={form.subtitle}
              onChange={(event) => setField('subtitle', event.target.value)}
              placeholder="Văn bản hỗ trợ (tùy chọn)"
            />
            <Input
              label="Liên kết đích (tùy chọn)"
              value={form.linkUrl}
              onChange={(event) => setField('linkUrl', event.target.value)}
              placeholder="vd. /books/12, /?category=8, hoặc https://..."
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
              <span>Hiển thị banner này trên trang chủ</span>
            </label>

            <div className="confirm-dialog-actions">
              <Button type="button" variant="secondary" onClick={() => setFormOpen(false)} disabled={submitting}>
                Hủy
              </Button>
              <Button type="submit" loading={submitting} disabled={uploadingImage}>
                {editingId ? 'Lưu thay đổi' : 'Tạo banner'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Xóa banner?" onClose={() => setDeleteTarget(null)} hideClose={deleting}>
          <div className="stack">
            <p>
              <strong>{deleteTarget.title}</strong> sẽ bị xóa vĩnh viễn khỏi trang chủ.
            </p>
            <div className="confirm-dialog-actions">
              <Button type="button" variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Hủy
              </Button>
              <Button type="button" variant="secondary" className="danger-action" onClick={confirmDelete} loading={deleting}>
                Xóa banner
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
