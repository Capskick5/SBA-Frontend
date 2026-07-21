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
        setError(getErrorMessage(err, 'Could not load gift wrap options.'));
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
      showToast(getErrorMessage(err, 'Failed to upload gift wrap image.'), 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const submitGiftWrap = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setFormError('Enter a gift wrap name.');
      return;
    }
    if (!form.imageKey) {
      setFormError('Upload a gift wrap image.');
      return;
    }
    const feeVnd = Number(form.feeVnd);
    if (!Number.isFinite(feeVnd) || feeVnd < 0) {
      setFormError('Fee must be a non-negative number.');
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
      name: form.name.trim(),
      imageKey: form.imageKey,
      feeVnd,
      displayOrder,
      active: form.active,
    };

    try {
      if (editingId) {
        await updateGiftWrap(editingId, payload, { imageUrl: imagePreviewUrl });
        showToast('Gift wrap updated.');
      } else {
        await createGiftWrap(payload, { imageUrl: imagePreviewUrl });
        showToast('Gift wrap created.');
      }
      setFormOpen(false);
      reloadGiftWraps();
    } catch (err) {
      setFormError(getErrorMessage(err, 'Could not save this gift wrap.'));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (giftWrap) => {
    try {
      await setGiftWrapActive(giftWrap.id, !giftWrap.active);
      showToast(giftWrap.active ? 'Gift wrap deactivated.' : 'Gift wrap activated.');
      reloadGiftWraps();
    } catch (err) {
      showToast(getErrorMessage(err, 'Could not update gift wrap status.'), 'error');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteGiftWrap(deleteTarget.id);
      showToast('Gift wrap deleted.');
      setDeleteTarget(null);
      reloadGiftWraps();
    } catch (err) {
      showToast(getErrorMessage(err, 'Could not delete this gift wrap. If it was already used in an order, deactivate it instead.'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: 'imageUrl',
      label: 'Preview',
      render: (giftWrap) => (
        <div className="banner-thumb-cell">
          {giftWrap.imageUrl ? (
            <img src={giftWrap.imageUrl} alt={giftWrap.name} />
          ) : (
            <span className="muted">No image</span>
          )}
        </div>
      ),
    },
    { key: 'name', label: 'Name' },
    { key: 'feeVnd', label: 'Fee', render: (giftWrap) => formatCurrency(giftWrap.feeVnd) },
    { key: 'displayOrder', label: 'Order' },
    {
      key: 'active',
      label: 'Status',
      render: (giftWrap) => (
        <span className={`status-badge ${giftWrap.active ? 'delivered' : 'unknown'}`}>
          {giftWrap.active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (giftWrap) => (
        <div className="banner-row-actions">
          <Button type="button" className="btn-secondary" onClick={() => openEdit(giftWrap)}>
            Edit
          </Button>
          <Button type="button" className="btn-secondary" onClick={() => toggleActive(giftWrap)}>
            {giftWrap.active ? 'Deactivate' : 'Activate'}
          </Button>
          <Button type="button" className="btn-secondary danger-action" onClick={() => setDeleteTarget(giftWrap)}>
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
          <h1>Gift wraps</h1>
          <p>Configure the gift wrap options and fees shown during checkout.</p>
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus size={17} /> Add gift wrap
        </Button>
      </header>

      <div className="admin-banners-subheader">
        <h2>Gift wrap options</h2>
        {usingMockGiftWraps && (
          <span className="status-badge unknown">Offline mock fallback</span>
        )}
      </div>

      {loading ? (
        <LoadingState text="Loading gift wraps..." />
      ) : error ? (
        <ErrorState text={error}>
          <Button type="button" onClick={reloadGiftWraps}>Try again</Button>
        </ErrorState>
      ) : (
        <Table columns={columns} rows={giftWraps} emptyText="No gift wrap options yet. Add one so customers can choose it at checkout." />
      )}

      {formOpen && (
        <Modal title={editingId ? 'Edit gift wrap' : 'Add gift wrap'} onClose={() => setFormOpen(false)}>
          <form className="form" onSubmit={submitGiftWrap}>
            {formError && <p className="form-message form-message-error">{formError}</p>}

            <div className="field">
              <span>Gift wrap image</span>
              <input type="file" accept="image/*" onChange={handleImageChange} />
              {uploadingImage && <p className="muted">Uploading...</p>}
              {imagePreviewUrl && (
                <div className="banner-thumb-cell banner-form-preview">
                  <img src={imagePreviewUrl} alt="Gift wrap preview" />
                </div>
              )}
            </div>

            <Input
              label="Name"
              value={form.name}
              onChange={(event) => setField('name', event.target.value)}
              placeholder="e.g. Giấy hoa văn đỏ"
              required
            />
            <Input
              label="Fee (VND)"
              type="number"
              min="0"
              step="1000"
              value={form.feeVnd}
              onChange={(event) => setField('feeVnd', event.target.value)}
              required
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
              <span>Show this gift wrap option at checkout</span>
            </label>

            <div className="confirm-dialog-actions">
              <Button type="button" className="btn-secondary" onClick={() => setFormOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting} disabled={uploadingImage}>
                {editingId ? 'Save changes' : 'Create gift wrap'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Delete gift wrap?" onClose={() => setDeleteTarget(null)} hideClose={deleting}>
          <div className="stack">
            <p>
              <strong>{deleteTarget.name}</strong> will be permanently removed from checkout options.
            </p>
            <div className="confirm-dialog-actions">
              <Button type="button" className="btn-secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Cancel
              </Button>
              <Button type="button" className="danger-action" onClick={confirmDelete} loading={deleting}>
                Delete gift wrap
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
