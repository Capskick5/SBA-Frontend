import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Table from '../../components/ui/Table';
import { ErrorState, LoadingState } from '../../components/ui/State';
import { adminService } from '../../services/adminService';
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

  useEffect(() => {
    let active = true;
    adminService.getBannersAdmin()
      .then((list) => {
        if (!active) return;
        setBanners(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        if (!active) return;
        setBanners([]);
        setError(getErrorMessage(err, 'Could not load banners.'));
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
      showToast(getErrorMessage(err, 'Failed to upload banner image.'), 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const submitBanner = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setFormError('Enter a banner title.');
      return;
    }
    if (!form.imageKey) {
      setFormError('Upload a banner image.');
      return;
    }
    const displayOrder = Number(form.displayOrder);
    if (!Number.isFinite(displayOrder)) {
      setFormError('Display order must be a number.');
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
        await adminService.updateBanner(editingId, payload);
        showToast('Banner updated.');
      } else {
        await adminService.createBanner(payload);
        showToast('Banner created.');
      }
      setFormOpen(false);
      reloadBanners();
    } catch (err) {
      setFormError(getErrorMessage(err, 'Could not save this banner.'));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (banner) => {
    try {
      await adminService.setBannerActive(banner.id, !banner.active);
      showToast(banner.active ? 'Banner deactivated.' : 'Banner activated.');
      reloadBanners();
    } catch (err) {
      showToast(getErrorMessage(err, 'Could not update banner status.'), 'error');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminService.deleteBanner(deleteTarget.id);
      showToast('Banner deleted.');
      setDeleteTarget(null);
      reloadBanners();
    } catch (err) {
      showToast(getErrorMessage(err, 'Could not delete this banner.'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: 'imageUrl',
      label: 'Preview',
      render: (banner) => (
        <div className="banner-thumb-cell">
          {banner.imageUrl ? (
            <img src={banner.imageUrl} alt={banner.title} />
          ) : (
            <span className="muted">No image</span>
          )}
        </div>
      ),
    },
    { key: 'title', label: 'Title' },
    { key: 'subtitle', label: 'Subtitle', render: (banner) => banner.subtitle || '-' },
    { key: 'displayOrder', label: 'Order' },
    {
      key: 'active',
      label: 'Status',
      render: (banner) => (
        <span className={`status-badge ${banner.active ? 'delivered' : 'unknown'}`}>
          {banner.active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (banner) => (
        <div className="banner-row-actions">
          <Button type="button" className="btn-secondary" onClick={() => openEdit(banner)}>
            Edit
          </Button>
          <Button type="button" className="btn-secondary" onClick={() => toggleActive(banner)}>
            {banner.active ? 'Deactivate' : 'Activate'}
          </Button>
          <Button type="button" className="btn-secondary danger-action" onClick={() => setDeleteTarget(banner)}>
            <Trash2 size={15} /> Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <section className="stack">
      <header className="admin-banners-header">
        <div>
          <h1>Homepage Banners</h1>
          <p>Manage the promotional banners shown at the top of the storefront homepage.</p>
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus size={17} /> Add banner
        </Button>
      </header>

      {loading ? (
        <LoadingState text="Loading banners..." />
      ) : error ? (
        <ErrorState text={error}>
          <Button type="button" onClick={reloadBanners}>Try again</Button>
        </ErrorState>
      ) : (
        <Table columns={columns} rows={banners} emptyText="No banners yet. Add one to show it on the homepage." />
      )}

      {formOpen && (
        <Modal title={editingId ? 'Edit banner' : 'Add banner'} onClose={() => setFormOpen(false)}>
          <form className="form" onSubmit={submitBanner}>
            {formError && <p className="form-message form-message-error">{formError}</p>}

            <div className="field">
              <span>Banner image</span>
              <input type="file" accept="image/*" onChange={handleImageChange} />
              {uploadingImage && <p className="muted">Uploading...</p>}
              {imagePreviewUrl && (
                <div className="banner-thumb-cell banner-form-preview">
                  <img src={imagePreviewUrl} alt="Banner preview" />
                </div>
              )}
            </div>

            <Input
              label="Title"
              value={form.title}
              onChange={(event) => setField('title', event.target.value)}
              placeholder="e.g. Explore BookVerse"
              required
            />
            <Input
              label="Subtitle"
              value={form.subtitle}
              onChange={(event) => setField('subtitle', event.target.value)}
              placeholder="Optional supporting text"
            />
            <Input
              label="Destination link (optional)"
              value={form.linkUrl}
              onChange={(event) => setField('linkUrl', event.target.value)}
              placeholder="e.g. /books/12, /?category=8, or https://..."
            />
            <Input
              label="Display order"
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
              <span>Show this banner on the homepage</span>
            </label>

            <div className="confirm-dialog-actions">
              <Button type="button" className="btn-secondary" onClick={() => setFormOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting} disabled={uploadingImage}>
                {editingId ? 'Save changes' : 'Create banner'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Delete banner?" onClose={() => setDeleteTarget(null)} hideClose={deleting}>
          <div className="stack">
            <p>
              <strong>{deleteTarget.title}</strong> will be permanently removed from the homepage.
            </p>
            <div className="confirm-dialog-actions">
              <Button type="button" className="btn-secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Cancel
              </Button>
              <Button type="button" className="danger-action" onClick={confirmDelete} loading={deleting}>
                Delete banner
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
