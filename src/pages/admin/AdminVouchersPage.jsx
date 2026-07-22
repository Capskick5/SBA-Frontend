import { useEffect, useState } from 'react';
import { Plus, Trash2, TicketPercent } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Table from '../../components/ui/Table';
import AdminPageHeader from '../../components/ui/AdminPageHeader';
import AdminToolbar, { AdminFilterField } from '../../components/ui/AdminToolbar';
import AdminPagination from '../../components/ui/AdminPagination';
import { ErrorState, LoadingState } from '../../components/ui/State';
import { adminService } from '../../services/adminService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { showToast } from '../../utils/toast';
import styles from './AdminVouchersPage.module.css';

const PAGE_SIZE = 10;

const STATUS_LABELS = {
  ACTIVE: 'Đang hiệu lực',
  INACTIVE: 'Ngừng',
  EXPIRED: 'Hết hạn',
};

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

function getMinNow() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatReward(voucher) {
  if (voucher.discountType === 'PERCENTAGE') {
    const cap = voucher.maxDiscountAmount ? ` (Tối đa ${formatCurrency(voucher.maxDiscountAmount)})` : '';
    return `Giảm ${voucher.discountValue}%${cap}`;
  }
  return `Giảm ${formatCurrency(voucher.discountValue)}`;
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
        setError(getErrorMessage(err, 'Không thể tải danh sách mã giảm giá.'));
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

  const campaignName = (id) => campaigns.find((c) => String(c.id) === String(id))?.name || 'Mã tự do (Không chiến dịch)';

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
      setFormError('Vui lòng nhập Mã giảm giá và Tên hiển thị.');
      return;
    }
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      setFormError('Số tiền/phần trăm giảm giá phải là số dương.');
      return;
    }
    if (form.discountType === 'PERCENTAGE' && discountValue > 100) {
      setFormError('Giảm giá theo phần trăm không được vượt quá 100%.');
      return;
    }
    if (!Number.isFinite(minOrderValue) || minOrderValue < 0) {
      setFormError('Giá trị đơn hàng tối thiểu không được là số âm.');
      return;
    }
    if (!Number.isFinite(totalQuantity) || totalQuantity <= 0) {
      setFormError('Tổng số lượng phát hành phải lớn hơn 0.');
      return;
    }
    const startTime = toInstant(form.startTime);
    const endTime = toInstant(form.endTime);
    if (!startTime || !endTime) {
      setFormError('Vui lòng chọn thời gian bắt đầu và kết thúc.');
      return;
    }

    // Past date check
    if (!editingId && new Date(startTime) < new Date(Date.now() - 60000)) {
      setFormError('Thời gian bắt đầu không được ở trong quá khứ.');
      return;
    }

    if (new Date(endTime) <= new Date(startTime)) {
      setFormError('Thời gian kết thúc phải diễn ra sau thời gian bắt đầu.');
      return;
    }

    const payload = {
      campaignId: form.campaignId ? Number(form.campaignId) : null,
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      discountType: form.discountType,
      discountValue,
      maxDiscountAmount:
        form.discountType === 'PERCENTAGE' && form.maxDiscountAmount
          ? Number(form.maxDiscountAmount)
          : null,
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
        showToast('Cập nhật mã giảm giá thành công.');
      } else {
        await adminService.createVoucher(payload);
        showToast('Tạo mã giảm giá mới thành công.');
      }
      setFormOpen(false);
      if (currentPage === 0) reload();
      else changePage(0);
    } catch (err) {
      setFormError(getErrorMessage(err, 'Không thể lưu thông tin mã giảm giá.'));
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
      showToast('Đã xóa mã giảm giá.');
      reload();
    } catch (err) {
      showToast(getErrorMessage(err, 'Không thể xóa mã giảm giá này.'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { key: 'code', label: 'Mã giảm giá', render: (v) => <strong>{v.code}</strong> },
    { key: 'name', label: 'Tên hiển thị' },
    { key: 'reward', label: 'Mức giảm giá', render: formatReward },
    { key: 'minOrderValue', label: 'Đơn tối thiểu', render: (v) => formatCurrency(v.minOrderValue) },
    {
      key: 'quantity',
      label: 'Đã nhận / Tổng số',
      render: (v) => `${v.claimedQuantity ?? 0} / ${v.totalQuantity ?? 0}`,
    },
    { key: 'campaign', label: 'Thuộc chiến dịch', render: (v) => campaignName(v.campaignId) },
    {
      key: 'period',
      label: 'Thời gian hiệu lực',
      render: (v) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.84rem' }}>
          <span>Từ: {formatDateTime(v.startTime)}</span>
          <span>Đến: {formatDateTime(v.endTime)}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (v) => (
        <span className={`${styles.status} ${v.status === 'ACTIVE' ? styles.active : styles.disabled}`}>
          {STATUS_LABELS[v.status] || v.status}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Thao tác',
      render: (v) => (
        <div className="admin-row-actions">
          <Button type="button" variant="secondary" size="sm" onClick={() => openEdit(v)}>
            Sửa
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="danger-action"
            onClick={() => setDeleteTarget(v)}
          >
            <Trash2 size={15} /> Xóa
          </Button>
        </div>
      ),
    },
  ];

  const minNow = getMinNow();

  return (
    <section className={`${styles.page} stack`}>
      <AdminPageHeader
        kicker="Khuyến mãi"
        title="Quản lý mã giảm giá"
        subtitle="Tạo và quản lý các mã giảm giá cho phép khách hàng thu thập và sử dụng khi thanh toán."
        actions={(
          <Button type="button" onClick={openCreate}>
            <Plus size={17} /> Tạo mã giảm giá
          </Button>
        )}
      />

      <AdminToolbar
        end={(
          <div className={styles.rulePolicy}>
            <TicketPercent size={18} />
            <span>Gắn mã giảm giá vào chiến dịch tương ứng để tự động hiển thị trong kho ưu đãi của khách hàng.</span>
          </div>
        )}
      >
        <AdminFilterField label="Lọc theo trạng thái">
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
            <option value="ACTIVE">Đang hiệu lực</option>
            <option value="INACTIVE">Ngừng</option>
            <option value="EXPIRED">Hết hạn</option>
          </select>
        </AdminFilterField>
      </AdminToolbar>

      {loading ? (
        <LoadingState text="Đang tải danh sách mã giảm giá..." />
      ) : error ? (
        <ErrorState text={error}>
          <Button type="button" onClick={reload}>Thử lại</Button>
        </ErrorState>
      ) : (
        <>
          <Table columns={columns} rows={vouchers} emptyText="Chưa có mã giảm giá nào." />
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
          title={editingId ? 'Chỉnh sửa mã giảm giá' : 'Tạo mã giảm giá mới'}
          onClose={() => setFormOpen(false)}
          maxWidth="560px"
        >
          <form onSubmit={submit} className="stack">
            {formError && <div className={styles.formError}>{formError}</div>}
            <div className={styles.formGrid}>
              <Input
                label="Mã giảm giá (Ví dụ: WELCOME20)"
                value={form.code}
                onChange={(event) => setField('code', event.target.value.toUpperCase())}
                placeholder="VD: WELCOME20"
                required
              />
              <Input
                label="Tên hiển thị"
                value={form.name}
                onChange={(event) => setField('name', event.target.value)}
                placeholder="VD: Giảm 20% đơn đầu tiên"
                required
              />
            </div>

            <label className="field">
              <span>Thuộc chiến dịch (Tùy chọn)</span>
              <select value={form.campaignId} onChange={(event) => setField('campaignId', event.target.value)}>
                <option value="">Không thuộc chiến dịch nào (Mã tự do)</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Loại giảm giá</span>
              <select value={form.discountType} onChange={(event) => setField('discountType', event.target.value)}>
                <option value="FIXED_AMOUNT">Giảm số tiền cố định (VND)</option>
                <option value="PERCENTAGE">Giảm theo phần trăm (%)</option>
              </select>
            </label>

            {form.discountType === 'PERCENTAGE' ? (
              <div className={styles.formGrid}>
                <Input
                  label="Phần trăm giảm (%)"
                  type="number"
                  min="1"
                  max="100"
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
                  placeholder="Số tiền giảm tối đa"
                />
              </div>
            ) : (
              <Input
                label="Số tiền giảm (VND)"
                type="number"
                min="1"
                value={form.discountValue}
                onChange={(event) => setField('discountValue', event.target.value)}
                required
              />
            )}

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

            {/* Stacked date inputs to prevent overlapping */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <Input
                label="Thời gian bắt đầu (Không chọn ngày trong quá khứ)"
                type="datetime-local"
                min={editingId ? undefined : minNow}
                value={form.startTime}
                onChange={(event) => setField('startTime', event.target.value)}
                required
              />
              <Input
                label="Thời gian kết thúc"
                type="datetime-local"
                min={form.startTime || minNow}
                value={form.endTime}
                onChange={(event) => setField('endTime', event.target.value)}
                required
              />
            </div>

            <label className="field">
              <span>Trạng thái</span>
              <select value={form.status} onChange={(event) => setField('status', event.target.value)}>
                <option value="ACTIVE">Đang hiệu lực</option>
                <option value="INACTIVE">Ngừng</option>
              </select>
            </label>

            <div className={styles.modalActions}>
              <Button type="button" variant="secondary" onClick={() => setFormOpen(false)} disabled={submitting}>
                Hủy
              </Button>
              <Button type="submit" loading={submitting}>
                {editingId ? 'Lưu thay đổi' : 'Tạo mã giảm giá'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Xác nhận xóa mã giảm giá?" onClose={() => setDeleteTarget(null)} hideClose={deleting}>
          <div className={styles.confirmBody}>
            <p>
              Mã giảm giá <strong>{deleteTarget.code}</strong> sẽ bị xóa khỏi hệ thống. Khách hàng chưa thu thập sẽ không thể nhận mã này nữa.
            </p>
            <div className={styles.modalActions}>
              <Button type="button" variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Hủy
              </Button>
              <Button type="button" variant="secondary" className="danger-action" onClick={confirmDelete} loading={deleting}>
                Xác nhận xóa
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
