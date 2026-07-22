import { useEffect, useState } from 'react';
import { Plus, Trash2, Megaphone } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Table from '../../components/ui/Table';
import AdminPageHeader from '../../components/ui/AdminPageHeader';
import AdminToolbar from '../../components/ui/AdminToolbar';
import AdminPagination from '../../components/ui/AdminPagination';
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
  FLASH_SALE: 'Giờ vàng',
  WELCOME_GIFT: 'Thành viên mới',
};

const STATUS_LABELS = {
  ACTIVE: 'Đang hiệu lực',
  INACTIVE: 'Ngừng',
  COMPLETED: 'Đã kết thúc',
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
        setError(getErrorMessage(err, 'Không thể tải danh sách chiến dịch.'));
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
      setFormError('Vui lòng nhập tên chiến dịch.');
      return;
    }
    const startTime = toInstant(form.startTime);
    if (!startTime) {
      setFormError('Vui lòng chọn thời gian bắt đầu.');
      return;
    }

    // Validation: Start time cannot be in the past when creating
    if (!editingId && new Date(startTime) < new Date(Date.now() - 60000)) {
      setFormError('Thời gian bắt đầu không được ở trong quá khứ.');
      return;
    }

    const endTime = toInstant(form.endTime);
    if (endTime && new Date(endTime) <= new Date(startTime)) {
      setFormError('Thời gian kết thúc phải diễn ra sau thời gian bắt đầu.');
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
        showToast('Cập nhật chiến dịch thành công.');
      } else {
        await adminService.createCampaign(payload);
        showToast('Tạo chiến dịch thành công.');
      }
      setFormOpen(false);
      if (currentPage === 0) reload();
      else changePage(0);
    } catch (err) {
      setFormError(getErrorMessage(err, 'Không thể lưu thông tin chiến dịch.'));
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
      showToast('Đã xóa chiến dịch.');
      reload();
    } catch (err) {
      showToast(getErrorMessage(err, 'Không thể xóa chiến dịch này.'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { key: 'name', label: 'Tên chiến dịch', render: (c) => <strong>{c.name}</strong> },
    { key: 'campaignType', label: 'Phân loại', render: (c) => TYPE_LABELS[c.campaignType] || c.campaignType },
    {
      key: 'isAutoDistributed',
      label: 'Cách phân phối',
      render: (c) => (c.isAutoDistributed ? 'Tự động gửi' : 'Khách tự thu thập'),
    },
    {
      key: 'period',
      label: 'Thời gian áp dụng',
      render: (c) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.84rem' }}>
          <span>Từ: {formatDateTime(c.startTime)}</span>
          <span>Đến: {c.endTime ? formatDateTime(c.endTime) : 'Không giới hạn'}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (c) => (
        <span className={`${styles.status} ${c.status === 'ACTIVE' ? styles.active : styles.disabled}`}>
          {STATUS_LABELS[c.status] || c.status}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Thao tác',
      render: (c) => (
        <div className="admin-row-actions">
          <Button type="button" variant="secondary" size="sm" onClick={() => openEdit(c)}>
            Sửa
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="danger-action"
            onClick={() => setDeleteTarget(c)}
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
        title="Quản lý chiến dịch"
        subtitle="Tạo và quản lý các chiến dịch khuyến mãi như Giờ vàng hoặc Chào mừng thành viên mới."
        actions={(
          <Button type="button" onClick={openCreate}>
            <Plus size={17} /> Tạo chiến dịch mới
          </Button>
        )}
      />

      <AdminToolbar>
        <div className={styles.rulePolicy}>
          <Megaphone size={18} />
          <span>Gắn các mã giảm giá vào chiến dịch tương ứng. Khách hàng sẽ thấy các chiến dịch này tại Trang chủ.</span>
        </div>
      </AdminToolbar>

      {loading ? (
        <LoadingState text="Đang tải danh sách chiến dịch..." />
      ) : error ? (
        <ErrorState text={error}>
          <Button type="button" onClick={reload}>Thử lại</Button>
        </ErrorState>
      ) : (
        <>
          <Table columns={columns} rows={campaigns} emptyText="Chưa có chiến dịch nào." />
          {campaigns.length > 0 && (
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
          title={editingId ? 'Chỉnh sửa chiến dịch' : 'Tạo chiến dịch mới'}
          onClose={() => setFormOpen(false)}
          maxWidth="540px"
        >
          <form onSubmit={submit} className="stack">
            {formError && <div className={styles.formError}>{formError}</div>}
            <Input
              label="Tên chiến dịch"
              value={form.name}
              onChange={(event) => setField('name', event.target.value)}
              placeholder="VD: Giờ vàng hè 2026"
              required
            />
            <label className="field">
              <span>Loại chiến dịch</span>
              <select value={form.campaignType} onChange={(event) => setField('campaignType', event.target.value)}>
                <option value="FLASH_SALE">Giờ vàng</option>
                <option value="WELCOME_GIFT">Thành viên mới</option>
              </select>
            </label>

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
                label="Thời gian kết thúc (Tùy chọn)"
                type="datetime-local"
                min={form.startTime || minNow}
                value={form.endTime}
                onChange={(event) => setField('endTime', event.target.value)}
              />
            </div>

            <label className="field">
              <span>Trạng thái</span>
              <select value={form.status} onChange={(event) => setField('status', event.target.value)}>
                <option value="ACTIVE">Đang hiệu lực</option>
                <option value="INACTIVE">Ngừng</option>
                <option value="COMPLETED">Đã kết thúc</option>
              </select>
            </label>
            <label className={styles.activeCheck}>
              <input
                type="checkbox"
                checked={form.isAutoDistributed}
                onChange={(event) => setField('isAutoDistributed', event.target.checked)}
              />
              <span>Tự động tặng mã giảm giá cho khách hàng đủ điều kiện</span>
            </label>
            <div className={styles.modalActions}>
              <Button type="button" variant="secondary" onClick={() => setFormOpen(false)} disabled={submitting}>
                Hủy
              </Button>
              <Button type="submit" loading={submitting}>
                {editingId ? 'Lưu thay đổi' : 'Tạo chiến dịch'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Xác nhận xóa chiến dịch?" onClose={() => setDeleteTarget(null)} hideClose={deleting}>
          <div className={styles.confirmBody}>
            <p>
              Chiến dịch <strong>{deleteTarget.name}</strong> sẽ bị xóa. Các mã giảm giá liên kết sẽ trở thành mã tự do.
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
