import { useEffect, useState } from 'react';
import { Ban, Copy, Plus, TicketPercent } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Table from '../../components/ui/Table';
import { ErrorState, LoadingState } from '../../components/ui/State';
import { adminService } from '../../services/adminService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { showToast } from '../../utils/toast';
import styles from './AdminVouchersPage.module.css';

const PAGE_SIZE = 10;

const EMPTY_FORM = {
  name: '',
  codePrefix: '',
  discountType: 'FIXED',
  discountValue: '',
  tierMinAmount: '',
  active: true,
};

function formatReward(rule) {
  if (rule.discountType === 'PERCENTAGE') return `${rule.discountValue}% off`;
  return `${formatCurrency(rule.discountValue)} off`;
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

export default function AdminVouchersPage() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [disableTarget, setDisableTarget] = useState(null);
  const [disabling, setDisabling] = useState(false);

  useEffect(() => {
    let activeRequest = true;
    const active = filter === 'all' ? undefined : filter === 'active';

    adminService.getVoucherRules({
        page: currentPage,
        size: PAGE_SIZE,
        sort: 'createdAt,desc',
        ...(active === undefined ? {} : { active }),
      })
      .then((page) => {
        if (!activeRequest) return;
        setRules(Array.isArray(page?.items) ? page.items : []);
        setTotalPages(Math.max(page?.totalPages || 1, 1));
      })
      .catch((err) => {
        if (!activeRequest) return;
        setRules([]);
        setTotalPages(1);
        setError(getErrorMessage(err, 'Could not load voucher rules.'));
      })
      .finally(() => {
        if (activeRequest) setLoading(false);
      });

    return () => {
      activeRequest = false;
    };
  }, [currentPage, filter, reloadKey]);

  const reloadRules = () => {
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
    setFormError('');
    setFormOpen(true);
  };

  const openClone = (rule) => {
    setForm({
      name: `${rule.name} Copy`,
      codePrefix: rule.codePrefix || '',
      discountType: rule.discountType || 'FIXED',
      discountValue: String(rule.discountValue ?? ''),
      tierMinAmount: String(rule.tierMinAmount ?? ''),
      active: true,
    });
    setFormError('');
    setFormOpen(true);
  };

  const setField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const submitRule = async (event) => {
    event.preventDefault();
    const discountValue = Number(form.discountValue);
    const tierMinAmount = Number(form.tierMinAmount);

    if (!form.name.trim() || !Number.isFinite(discountValue) || discountValue <= 0) {
      setFormError('Enter a rule name and a positive discount value.');
      return;
    }
    if (!Number.isFinite(tierMinAmount) || tierMinAmount < 0) {
      setFormError('Minimum order amount cannot be negative.');
      return;
    }
    if (form.discountType === 'PERCENTAGE' && discountValue > 100) {
      setFormError('Percentage discount cannot exceed 100%.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      await adminService.createVoucherRule({
        name: form.name.trim(),
        codePrefix: form.codePrefix.trim() || null,
        discountType: form.discountType,
        discountValue,
        tierMinAmount,
        active: form.active,
      });
      setFormOpen(false);
      showToast('Voucher reward rule created.');
      if (currentPage === 0) {
        reloadRules();
      } else {
        changePage(0);
      }
    } catch (err) {
      setFormError(getErrorMessage(err, 'Could not create voucher rule.'));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDisable = async () => {
    if (!disableTarget) return;
    setDisabling(true);
    try {
      await adminService.disableVoucherRule(disableTarget.id);
      setDisableTarget(null);
      showToast('Voucher reward rule disabled.');
      reloadRules();
    } catch (err) {
      showToast(getErrorMessage(err, 'Could not disable voucher rule.'), 'error');
    } finally {
      setDisabling(false);
    }
  };

  const columns = [
    { key: 'name', label: 'Rule Name' },
    { key: 'reward', label: 'Reward', render: formatReward },
    {
      key: 'tierMinAmount',
      label: 'Minimum Order',
      render: (rule) => formatCurrency(rule.tierMinAmount),
    },
    { key: 'codePrefix', label: 'Code Prefix', render: (rule) => rule.codePrefix || 'BV' },
    {
      key: 'active',
      label: 'Status',
      render: (rule) => (
        <span className={`${styles.status} ${rule.active ? styles.active : styles.disabled}`}>
          {rule.active ? 'Active' : 'Disabled'}
        </span>
      ),
    },
    { key: 'updatedAt', label: 'Last Updated', render: (rule) => formatDateTime(rule.updatedAt) },
    {
      key: 'actions',
      label: 'Actions',
      render: (rule) => (
        <div className={styles.rowActions}>
          <Button type="button" className="btn-secondary" onClick={() => openClone(rule)}>
            <Copy size={15} /> Clone
          </Button>
          {rule.active && (
            <Button type="button" className={styles.disableButton} onClick={() => setDisableTarget(rule)}>
              <Ban size={15} /> Disable
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <section className={`${styles.page} stack`}>
      <header className={styles.header}>
        <div>
          <span className={styles.kicker}>Promotions</span>
          <h1>Voucher Reward Rules</h1>
          <p>Configure the rules used for future customer voucher rewards.</p>
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus size={17} /> Create rule
        </Button>
      </header>

      <div className={styles.toolbar}>
        <label className={styles.filterField}>
          <span>Status</span>
          <select
            value={filter}
            onChange={(event) => {
              setLoading(true);
              setError('');
              setFilter(event.target.value);
              setCurrentPage(0);
            }}
          >
            <option value="all">All rules</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </label>
        <div className={styles.rulePolicy}>
          <TicketPercent size={18} />
          <span>Existing customer vouchers are not managed from this page.</span>
        </div>
      </div>

      {loading ? (
        <LoadingState text="Loading voucher rules..." />
      ) : error ? (
        <ErrorState text={error}>
          <Button type="button" onClick={reloadRules}>Try again</Button>
        </ErrorState>
      ) : (
        <>
          <Table columns={columns} rows={rules} emptyText="No voucher reward rules found." />
          {rules.length > 0 && (
            <div className={styles.pagination}>
              <Button
                type="button"
                className="btn-secondary"
                disabled={currentPage === 0}
                onClick={() => changePage(currentPage - 1)}
              >
                Previous
              </Button>
              <span>Page {currentPage + 1} of {totalPages}</span>
              <Button
                type="button"
                className="btn-secondary"
                disabled={currentPage >= totalPages - 1}
                onClick={() => changePage(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {formOpen && (
        <Modal title="Create voucher reward rule" onClose={() => setFormOpen(false)}>
          <form className={styles.form} onSubmit={submitRule}>
            {formError && <p className="form-message form-message-error">{formError}</p>}
            <Input
              label="Rule name"
              value={form.name}
              onChange={(event) => setField('name', event.target.value)}
              placeholder="e.g. 10% off orders over 300,000 VND"
              required
            />
            <Input
              label="Code prefix"
              value={form.codePrefix}
              onChange={(event) => setField('codePrefix', event.target.value.toUpperCase())}
              placeholder="e.g. TIER3"
              maxLength={20}
            />
            <label className="field">
              <span>Discount type</span>
              <select value={form.discountType} onChange={(event) => setField('discountType', event.target.value)}>
                <option value="FIXED">Fixed amount</option>
                <option value="PERCENTAGE">Percentage</option>
              </select>
            </label>
            <div className={styles.formGrid}>
              <Input
                label={form.discountType === 'PERCENTAGE' ? 'Discount percentage' : 'Discount amount (VND)'}
                type="number"
                min="1"
                max={form.discountType === 'PERCENTAGE' ? '100' : undefined}
                value={form.discountValue}
                onChange={(event) => setField('discountValue', event.target.value)}
                required
              />
              <Input
                label="Minimum order amount (VND)"
                type="number"
                min="0"
                value={form.tierMinAmount}
                onChange={(event) => setField('tierMinAmount', event.target.value)}
                required
              />
            </div>
            <label className={styles.activeCheck}>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => setField('active', event.target.checked)}
              />
              <span>Activate this rule immediately</span>
            </label>
            <div className={styles.modalActions}>
              <Button type="button" className="btn-secondary" onClick={() => setFormOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>Create rule</Button>
            </div>
          </form>
        </Modal>
      )}

      {disableTarget && (
        <Modal title="Disable voucher reward rule?" onClose={() => setDisableTarget(null)} hideClose={disabling}>
          <div className={styles.confirmBody}>
            <p>
              <strong>{disableTarget.name}</strong> will no longer be selected for future voucher rewards.
            </p>
            <div className={styles.modalActions}>
              <Button type="button" className="btn-secondary" onClick={() => setDisableTarget(null)} disabled={disabling}>
                Keep active
              </Button>
              <Button type="button" className={styles.disableButton} onClick={confirmDisable} loading={disabling}>
                Disable rule
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
