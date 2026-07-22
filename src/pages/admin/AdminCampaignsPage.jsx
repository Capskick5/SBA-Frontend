import { useEffect, useState } from 'react';
import { Plus, Trash2, Megaphone } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Table from '../../components/ui/Table';
import { ErrorState, LoadingState } from '../../components/ui/State';
import { adminService } from '../../services/adminService';
import { formatDateTime } from '../../utils/formatters';
import { showToast } from '../../utils/toast';
import styles from './AdminVouchersPage.module.css';

const PAGE_SIZE = 10;

const EMPTY_FORM = {
  name: '',
  campaignType: 'FLASH_SALE',
  isAutoDistributed: false,
  startTime: '',
  endTime: '',
  status: 'ACTIVE',
};

const TYPE_LABELS = {
  FLASH_SALE: 'Flash sale',
  WELCOME_GIFT: 'Welcome gift',
};

function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function toInstant(localValue) {
  if (!localValue) return null;
  const d = new Date(localValue);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let activeRequest = true;
    adminService.getCampaigns({ page: currentPage, size: PAGE_SIZE, sort: 'createdAt,desc' })
      .then((page) => {
        if (!activeRequest) return;
        setCampaigns(Array.isArray(page?.items) ? page.items : []);
        setTotalPages(Math.max(page?.totalPages || 1, 1));
      })
      .catch((err) => {
        if (!activeRequest) return;
        setCampaigns([]);
        setTotalPages(1);
        setError(getErrorMessage(err, 'Could not load campaigns.'));
      })
      .finally(() => {
        if (activeRequest) setLoading(false);
      });
    return () => {
      activeRequest = false;
    };
  }, [currentPage, reloadKey]);

  const reload = () => {
    setLoading(true);
    setError('');
    setReloadKey((key) => key + 1);
  };

  const changePage = (nextPage) => {
    setLoading(true);
    setError('');
    setCurrentPage(nextPage);
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (campaign) => {
    setForm({
      name: campaign.name || '',
      campaignType: campaign.campaignType || 'FLASH_SALE',
      isAutoDistributed: Boolean(campaign.isAutoDistributed),
      startTime: toLocalInput(campaign.startTime),
      endTime: toLocalInput(campaign.endTime),
      status: campaign.status || 'ACTIVE',
    });
    setEditingId(campaign.id);
    setFormError('');
    setFormOpen(true);
  };

  const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setFormError('Campaign name is required.');
      return;
    }
    const startTime = toInstant(form.startTime);
    if (!startTime) {
      setFormError('Start time is required.');
      return;
    }
    const endTime = toInstant(form.endTime);
    if (endTime && new Date(endTime) <= new Date(startTime)) {
      setFormError('End time must be after start time.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      campaignType: form.campaignType,
      isAutoDistributed: form.isAutoDistributed,
      startTime,
      endTime,
      status: form.status,
    };

    setSubmitting(true);
    setFormError('');
    try {
      if (editingId) {
        await adminService.updateCampaign(editingId, payload);
        showToast('Campaign updated.');
      } else {
        await adminService.createCampaign(payload);
        showToast('Campaign created.');
      }
      setFormOpen(false);
      if (currentPage === 0) reload();
      else changePage(0);
    } catch (err) {
      setFormError(getErrorMessage(err, 'Could not save campaign.'));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminService.deleteCampaign(deleteTarget.id);
      setDeleteTarget(null);
      showToast('Campaign deleted.');
      reload();
    } catch (err) {
      showToast(getErrorMessage(err, 'Could not delete campaign.'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { key: 'name', label: 'Name', render: (c) => <strong>{c.name}</strong> },
    { key: 'campaignType', label: 'Type', render: (c) => TYPE_LABELS[c.campaignType] || c.campaignType },
    {
      key: 'isAutoDistributed',
      label: 'Distribution',
      render: (c) => (c.isAutoDistributed ? 'Auto-distributed' : 'Manual claim'),
    },
    {
      key: 'period',
      label: 'Period',
      render: (c) => (
        <span className={styles.periodCell}>
          {formatDateTime(c.startTime)}<br />→ {c.endTime ? formatDateTime(c.endTime) : 'No end date'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (c) => (
        <span className={`${styles.status} ${c.status === 'ACTIVE' ? styles.active : styles.disabled}`}>
          {c.status}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (c) => (
        <div className={styles.rowActions}>
          <Button type="button" className="btn-secondary" onClick={() => openEdit(c)}>Edit</Button>
          <Button type="button" className={styles.disableButton} onClick={() => setDeleteTarget(c)}>
            <Trash2 size={15} /> Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <section className={`${styles.page} stack`}>
      <header className={styles.header}>
        <div>
          <span className={styles.kicker}>Promotions</span>
          <h1>Campaigns</h1>
          <p>Group vouchers into promotions such as flash sales or welcome gifts for new sign-ups.</p>
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus size={17} /> Create campaign
        </Button>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.rulePolicy}>
          <Megaphone size={18} />
          <span>Link vouchers to a campaign on the Vouchers page. Auto-distributed campaigns hand vouchers out automatically.</span>
        </div>
      </div>

      {loading ? (
        <LoadingState text="Loading campaigns..." />
      ) : error ? (
        <ErrorState text={error}>
          <Button type="button" onClick={reload}>Try again</Button>
        </ErrorState>
      ) : (
        <>
          <Table columns={columns} rows={campaigns} emptyText="No campaigns yet." />
          {campaigns.length > 0 && (
            <div className={styles.pagination}>
              <Button type="button" className="btn-secondary" disabled={currentPage === 0} onClick={() => changePage(currentPage - 1)}>
                Previous
              </Button>
              <span>Page {currentPage + 1} of {totalPages}</span>
              <Button type="button" className="btn-secondary" disabled={currentPage >= totalPages - 1} onClick={() => changePage(currentPage + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {formOpen && (
        <Modal
          title={editingId ? 'Edit campaign' : 'Create campaign'}
          onClose={() => setFormOpen(false)}
          maxWidth="520px"
        >
          <form onSubmit={submit} className="stack">
            {formError && <div className={styles.formError}>{formError}</div>}
            <Input
              label="Campaign name"
              value={form.name}
              onChange={(event) => setField('name', event.target.value)}
              placeholder="e.g. New Year Flash Sale"
              required
            />
            <label className="field">
              <span>Campaign type</span>
              <select value={form.campaignType} onChange={(event) => setField('campaignType', event.target.value)}>
                <option value="FLASH_SALE">Flash sale</option>
                <option value="WELCOME_GIFT">Welcome gift</option>
              </select>
            </label>
            <div className={styles.formGrid}>
              <Input
                label="Start time"
                type="datetime-local"
                value={form.startTime}
                onChange={(event) => setField('startTime', event.target.value)}
                required
              />
              <Input
                label="End time (optional)"
                type="datetime-local"
                value={form.endTime}
                onChange={(event) => setField('endTime', event.target.value)}
              />
            </div>
            <label className="field">
              <span>Status</span>
              <select value={form.status} onChange={(event) => setField('status', event.target.value)}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </label>
            <label className={styles.activeCheck}>
              <input
                type="checkbox"
                checked={form.isAutoDistributed}
                onChange={(event) => setField('isAutoDistributed', event.target.checked)}
              />
              <span>Auto-distribute vouchers to eligible customers</span>
            </label>
            <div className={styles.modalActions}>
              <Button type="button" className="btn-secondary" onClick={() => setFormOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                {editingId ? 'Save changes' : 'Create campaign'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Delete campaign?" onClose={() => setDeleteTarget(null)} hideClose={deleting}>
          <div className={styles.confirmBody}>
            <p>
              <strong>{deleteTarget.name}</strong> will be removed. Vouchers linked to it will no longer
              belong to a campaign.
            </p>
            <div className={styles.modalActions}>
              <Button type="button" className="btn-secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Cancel
              </Button>
              <Button type="button" className={styles.disableButton} onClick={confirmDelete} loading={deleting}>
                Delete campaign
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
