import { useEffect, useState } from 'react';
import { Plus, Trash2, TicketPercent } from 'lucide-react';
import Button from '../../components/ui/Button';
import AdminPagination from '../../components/ui/AdminPagination';
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
  campaignId: '',
  code: '',
  name: '',
  discountType: 'FIXED_AMOUNT',
  discountValue: '',
  maxDiscountAmount: '',
  minOrderValue: '',
  totalQuantity: '',
  startTime: '',
  endTime: '',
  status: 'ACTIVE',
};

// datetime-local (<input>) <-> ISO Instant helpers
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

function formatReward(voucher) {
  if (voucher.discountType === 'PERCENTAGE') {
    const cap = voucher.maxDiscountAmount ? ` (max ${formatCurrency(voucher.maxDiscountAmount)})` : '';
    return `${voucher.discountValue}%${cap}`;
  }
  return formatCurrency(voucher.discountValue);
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

export default function AdminVouchersPage() {
  const [vouchers, setVouchers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
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
    // Load campaigns once for the linkage dropdown / labels.
    adminService.getCampaigns({ page: 0, size: 100, sort: 'createdAt,desc' })
      .then((page) => setCampaigns(Array.isArray(page?.items) ? page.items : []))
      .catch(() => setCampaigns([]));
  }, []);

  useEffect(() => {
    let activeRequest = true;
    adminService.getVouchers({
      page: currentPage,
      size: PAGE_SIZE,
      sort: 'createdAt,desc',
      ...(statusFilter === 'all' ? {} : { status: statusFilter }),
    })
      .then((page) => {
        if (!activeRequest) return;
        setVouchers(Array.isArray(page?.items) ? page.items : []);
        setTotalPages(Math.max(page?.totalPages || 1, 1));
      })
      .catch((err) => {
        if (!activeRequest) return;
        setVouchers([]);
        setTotalPages(1);
        setError(getErrorMessage(err, 'Could not load vouchers.'));
      })
      .finally(() => {
        if (activeRequest) setLoading(false);
      });
    return () => {
      activeRequest = false;
    };
  }, [currentPage, statusFilter, reloadKey]);

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

  const campaignName = (id) => campaigns.find((c) => c.id === id)?.name || '—';

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (voucher) => {
    setForm({
      campaignId: voucher.campaignId ? String(voucher.campaignId) : '',
      code: voucher.code || '',
      name: voucher.name || '',
      discountType: voucher.discountType || 'FIXED_AMOUNT',
      discountValue: String(voucher.discountValue ?? ''),
      maxDiscountAmount: voucher.maxDiscountAmount != null ? String(voucher.maxDiscountAmount) : '',
      minOrderValue: String(voucher.minOrderValue ?? ''),
      totalQuantity: String(voucher.totalQuantity ?? ''),
      startTime: toLocalInput(voucher.startTime),
      endTime: toLocalInput(voucher.endTime),
      status: voucher.status || 'ACTIVE',
    });
    setEditingId(voucher.id);
    setFormError('');
    setFormOpen(true);
  };

  const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }));

  const submit = async (event) => {
    event.preventDefault();
    const discountValue = Number(form.discountValue);
    const minOrderValue = Number(form.minOrderValue);
    const totalQuantity = Number(form.totalQuantity);

    if (!form.code.trim() || !form.name.trim()) {
      setFormError('Code and name are required.');
      return;
    }
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      setFormError('Discount value must be a positive number.');
      return;
    }
    if (form.discountType === 'PERCENTAGE' && discountValue > 100) {
      setFormError('Giảm giá theo phần trăm không được vượt quá 100%.');
      return;
    }
    if (!Number.isFinite(minOrderValue) || minOrderValue < 0) {
      setFormError('Minimum order value cannot be negative.');
      return;
    }
    if (!Number.isFinite(totalQuantity) || totalQuantity <= 0) {
      setFormError('Total quantity must be a positive number.');
      return;
    }
    const startTime = toInstant(form.startTime);
    const endTime = toInstant(form.endTime);
    if (!startTime || !endTime) {
      setFormError('Start and end time are required.');
      return;
    }
    if (new Date(endTime) <= new Date(startTime)) {
      setFormError('End time must be after start time.');
      return;
    }

    const payload = {
      campaignId: form.campaignId ? Number(form.campaignId) : null,
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      discountType: form.discountType,
      discountValue,
      maxDiscountAmount: form.maxDiscountAmount ? Number(form.maxDiscountAmount) : null,
      minOrderValue,
      totalQuantity,
      startTime,
      endTime,
      status: form.status,
    };

    setSubmitting(true);
    setFormError('');
    try {
      if (editingId) {
        await adminService.updateVoucher(editingId, payload);
        showToast('Voucher updated.');
      } else {
        await adminService.createVoucher(payload);
        showToast('Voucher created.');
      }
      setFormOpen(false);
      if (currentPage === 0) reload();
      else changePage(0);
    } catch (err) {
      setFormError(getErrorMessage(err, 'Could not save voucher.'));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminService.deleteVoucher(deleteTarget.id);
      setDeleteTarget(null);
      showToast('Voucher deleted.');
      reload();
    } catch (err) {
      showToast(getErrorMessage(err, 'Could not delete voucher.'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { key: 'code', label: 'Mã voucher', render: (v) => <strong>{v.code}</strong> },
    { key: 'name', label: 'Tên hiển thị' },
    { key: 'reward', label: 'Mức giảm giá', render: formatReward },
    { key: 'minOrderValue', label: 'Đơn tối thiểu', render: (v) => formatCurrency(v.minOrderValue) },
    {
      key: 'quantity',
      label: 'Đã nhận / Tổng số',
      render: (v) => `${v.claimedQuantity ?? 0} / ${v.totalQuantity ?? 0}`,
    },
    { key: 'campaign', label: 'Chiến dịch', render: (v) => campaignName(v.campaignId) },
    {
      key: 'period',
      label: 'Thời hạn hiệu lực',
      render: (v) => (
        <span className={styles.periodCell}>
          {formatDateTime(v.startTime)}<br />→ {formatDateTime(v.endTime)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (v) => (
        <span className={`${styles.status} ${v.status === 'ACTIVE' ? styles.active : styles.disabled}`}>
          {v.status === 'ACTIVE' ? 'Hoạt động' : v.status === 'EXPIRED' ? 'Hết hạn' : 'Tắt'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Thao tác',
      render: (v) => (
        <div className="admin-row-actions">
          <Button type="button" variant="secondary" size="sm" onClick={() => openEdit(v)}>Sửa</Button>
          <Button type="button" variant="secondary" size="sm" className="danger-action" onClick={() => setDeleteTarget(v)}>
            <Trash2 size={15} /> Xóa
          </Button>
        </div>
      ),
    },
  ];

  return (
    <section className={`${styles.page} stack`}>
      <header className={styles.header}>
        <div>
          <span className={styles.kicker}>Khuyến mãi</span>
          <h1>Quản lý Voucher</h1>
          <p>Tạo và quản lý các mã voucher để khách hàng thu thập và sử dụng khi thanh toán.</p>
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus size={17} /> Tạo voucher
        </Button>
      </header>

      <div className={styles.toolbar}>
        <label className={styles.filterField}>
          <span>Trạng thái</span>
          <select
            value={statusFilter}
            onChange={(event) => {
              setLoading(true);
              setError('');
              setStatusFilter(event.target.value);
              setCurrentPage(0);
            }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="ACTIVE">Hoạt động</option>
            <option value="INACTIVE">Không hoạt động</option>
            <option value="EXPIRED">Đã hết hạn</option>
          </select>
        </label>
        <div className={styles.rulePolicy}>
          <TicketPercent size={18} />
          <span>Khách hàng thu thập voucher từ cửa hàng và áp dụng tại bước thanh toán.</span>
        </div>
      </div>

      {loading ? (
        <LoadingState text="Đang tải danh sách voucher..." />
      ) : error ? (
        <ErrorState text={error}>
          <Button type="button" onClick={reload}>Thử lại</Button>
        </ErrorState>
      ) : (
        <>
          <Table columns={columns} rows={vouchers} emptyText="Không tìm thấy voucher nào." />
          {vouchers.length > 0 && (
            <AdminPagination
              page={currentPage}
              totalPages={totalPages}
              onPageChange={changePage}
            />
          )}
        </>
      )}

      {formOpen && (
        <Modal
          title={editingId ? 'Sửa voucher' : 'Tạo voucher'}
          onClose={() => setFormOpen(false)}
          maxWidth="560px"
        >
          <form onSubmit={submit} className="stack">
            {formError && <div className={styles.formError}>{formError}</div>}
            <div className={styles.formGrid}>
              <Input
                label="Mã voucher"
                value={form.code}
                onChange={(event) => setField('code', event.target.value.toUpperCase())}
                placeholder="VD: WELCOME50"
                required
              />
              <Input
                label="Tên hiển thị"
                value={form.name}
                onChange={(event) => setField('name', event.target.value)}
                placeholder="VD: Quà chào mừng"
                required
              />
            </div>

            <label className="field">
              <span>Chiến dịch (Không bắt buộc)</span>
              <select value={form.campaignId} onChange={(event) => setField('campaignId', event.target.value)}>
                <option value="">Không thuộc chiến dịch nào</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Loại giảm giá</span>
              <select value={form.discountType} onChange={(event) => setField('discountType', event.target.value)}>
                <option value="FIXED_AMOUNT">Số tiền cố định</option>
                <option value="PERCENTAGE">Phần trăm (%)</option>
              </select>
            </label>

            <div className={styles.formGrid}>
              <Input
                label={form.discountType === 'PERCENTAGE' ? 'Phần trăm giảm giá' : 'Số tiền giảm (VND)'}
                type="number"
                min="1"
                max={form.discountType === 'PERCENTAGE' ? '100' : undefined}
                value={form.discountValue}
                onChange={(event) => setField('discountValue', event.target.value)}
                required
              />
              <Input
                label="Giảm tối đa (VND)"
                type="number"
                min="0"
                value={form.maxDiscountAmount}
                onChange={(event) => setField('maxDiscountAmount', event.target.value)}
                placeholder={form.discountType === 'PERCENTAGE' ? 'Giới hạn giảm cho phần trăm' : 'Không bắt buộc'}
              />
            </div>

            <div className={styles.formGrid}>
              <Input
                label="Đơn hàng tối thiểu (VND)"
                type="number"
                min="0"
                value={form.minOrderValue}
                onChange={(event) => setField('minOrderValue', event.target.value)}
                required
              />
              <Input
                label="Tổng số lượng phát hành"
                type="number"
                min="1"
                value={form.totalQuantity}
                onChange={(event) => setField('totalQuantity', event.target.value)}
                required
              />
            </div>

            <div className={styles.formGrid}>
              <Input
                label="Thời gian bắt đầu"
                type="datetime-local"
                value={form.startTime}
                onChange={(event) => setField('startTime', event.target.value)}
                required
              />
              <Input
                label="Thời gian kết thúc"
                type="datetime-local"
                value={form.endTime}
                onChange={(event) => setField('endTime', event.target.value)}
                required
              />
            </div>

            <label className="field">
              <span>Trạng thái</span>
              <select value={form.status} onChange={(event) => setField('status', event.target.value)}>
                <option value="ACTIVE">Hoạt động</option>
                <option value="INACTIVE">Không hoạt động</option>
                <option value="EXPIRED">Đã hết hạn</option>
              </select>
            </label>

            <div className={styles.modalActions}>
              <Button type="button" variant="secondary" onClick={() => setFormOpen(false)} disabled={submitting}>
                Hủy
              </Button>
              <Button type="submit" loading={submitting}>
                {editingId ? 'Lưu thay đổi' : 'Tạo voucher'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Xóa voucher?" onClose={() => setDeleteTarget(null)} hideClose={deleting}>
          <div className={styles.confirmBody}>
            <p>
              Voucher <strong>{deleteTarget.code}</strong> sẽ bị xóa khỏi hệ thống. Khách hàng sẽ không thể nhận thêm nữa. Voucher mà khách đã nhận trước đó không bị ảnh hưởng.
            </p>
            <div className={styles.modalActions}>
              <Button type="button" variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Hủy
              </Button>
              <Button type="button" variant="secondary" className="danger-action" onClick={confirmDelete} loading={deleting}>
                Xóa voucher
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
