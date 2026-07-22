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
  FLASH_SALE: 'Flash Sale (Giảm giá sốc)',
  WELCOME_GIFT: 'Quà chào mừng',
};

function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
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
    setReloadKey((k) => k + 1);
  };

  const changePage = (next) => {
    setLoading(true);
    setError('');
    setCurrentPage(next);
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (c) => {
    setForm({
      name: c.name || '',
      campaignType: c.campaignType || 'FLASH_SALE',
      isAutoDistributed: Boolean(c.isAutoDistributed),
      startTime: toLocalInput(c.startTime),
      endTime: toLocalInput(c.endTime),
      status: c.status || 'ACTIVE',
    });
    setEditingId(c.id);
    setFormError('');
    setFormOpen(true);
  };

  const setField = (name, value) => setForm((curr) => ({ ...curr, [name]: value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.startTime) {
      setFormError('Vui lòng nhập tên chiến dịch và thời gian bắt đầu.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      const payload = {
        name: form.name.trim(),
        campaignType: form.campaignType,
        isAutoDistributed: form.isAutoDistributed,
        startTime: new Date(form.startTime).toISOString(),
        endTime: form.endTime ? new Date(form.endTime).toISOString() : null,
        status: form.status,
      };
      if (editingId) {
        await adminService.updateCampaign(editingId, payload);
        showToast('Đã cập nhật chiến dịch.');
      } else {
        await adminService.createCampaign(payload);
        showToast('Đã tạo chiến dịch mới.');
      }
      setFormOpen(false);
      reload();
    } catch (err) {
      setFormError(getErrorMessage(err, 'Không thể lưu chiến dịch.'));
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
      showToast(getErrorMessage(err, 'Không thể xóa chiến dịch.'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { key: 'name', label: 'Tên chiến dịch', render: (c) => <strong>{c.name}</strong> },
    { key: 'campaignType', label: 'Loại chiến dịch', render: (c) => TYPE_LABELS[c.campaignType] || c.campaignType },
    {
      key: 'isAutoDistributed',
      label: 'Phân phối',
      render: (c) => (c.isAutoDistributed ? 'Tự động phát' : 'Khách tự nhận'),
    },
    {
      key: 'period',
      label: 'Thời gian',
      render: (c) => (
        <span className={styles.periodCell}>
          {formatDateTime(c.startTime)}<br />→ {c.endTime ? formatDateTime(c.endTime) : 'Không giới hạn'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (c) => (
        <span className={`${styles.status} ${c.status === 'ACTIVE' ? styles.active : styles.disabled}`}>
          {c.status === 'ACTIVE' ? 'Hoạt động' : c.status === 'COMPLETED' ? 'Hoàn thành' : 'Tắt'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Thao tác',
      render: (c) => (
        <div className={styles.rowActions}>
          <Button type="button" className="btn-secondary" onClick={() => openEdit(c)}>Sửa</Button>
          <Button type="button" className={styles.disableButton} onClick={() => setDeleteTarget(c)}>
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
          <h1>Quản lý Chiến dịch</h1>
          <p>Gom nhóm các mã voucher vào các chương trình khuyến mãi như Flash Sale hoặc Quà chào mừng.</p>
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus size={17} /> Tạo chiến dịch
        </Button>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.rulePolicy}>
          <Megaphone size={18} />
          <span>Gắn voucher vào chiến dịch tại trang Quản lý Voucher. Chiến dịch phân phối tự động sẽ tự trao voucher cho khách hàng phù hợp.</span>
        </div>
      </div>

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
            <div className={styles.pagination}>
              <Button type="button" className="btn-secondary" disabled={currentPage === 0} onClick={() => changePage(currentPage - 1)}>
                Trước
              </Button>
              <span>Trang {currentPage + 1} / {totalPages}</span>
              <Button type="button" className="btn-secondary" disabled={currentPage >= totalPages - 1} onClick={() => changePage(currentPage + 1)}>
                Sau
              </Button>
            </div>
          )}
        </>
      )}

      {formOpen && (
        <Modal
          title={editingId ? 'Sửa chiến dịch' : 'Tạo chiến dịch'}
          onClose={() => setFormOpen(false)}
          maxWidth="520px"
        >
          <form onSubmit={submit} className="stack">
            {formError && <div className={styles.formError}>{formError}</div>}
            <Input
              label="Tên chiến dịch"
              value={form.name}
              onChange={(event) => setField('name', event.target.value)}
              placeholder="VD: Flash Sale Đầu Năm"
              required
            />
            <label className="field">
              <span>Loại chiến dịch</span>
              <select value={form.campaignType} onChange={(event) => setField('campaignType', event.target.value)}>
                <option value="FLASH_SALE">Flash Sale (Giảm giá sốc)</option>
                <option value="WELCOME_GIFT">Quà chào mừng</option>
              </select>
            </label>
            <div className={styles.formGrid}>
              <Input
                label="Thời gian bắt đầu"
                type="datetime-local"
                value={form.startTime}
                onChange={(event) => setField('startTime', event.target.value)}
                required
              />
              <Input
                label="Thời gian kết thúc (Không bắt buộc)"
                type="datetime-local"
                value={form.endTime}
                onChange={(event) => setField('endTime', event.target.value)}
              />
            </div>
            <label className="field">
              <span>Trạng thái</span>
              <select value={form.status} onChange={(event) => setField('status', event.target.value)}>
                <option value="ACTIVE">Hoạt động</option>
                <option value="INACTIVE">Không hoạt động</option>
                <option value="COMPLETED">Đã hoàn thành</option>
              </select>
            </label>
            <label className={styles.activeCheck}>
              <input
                type="checkbox"
                checked={form.isAutoDistributed}
                onChange={(event) => setField('isAutoDistributed', event.target.checked)}
              />
              <span>Tự động phân phối voucher cho khách hàng đủ điều kiện</span>
            </label>
            <div className={styles.modalActions}>
              <Button type="button" className="btn-secondary" onClick={() => setFormOpen(false)} disabled={submitting}>
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
        <Modal title="Xóa chiến dịch?" onClose={() => setDeleteTarget(null)} hideClose={deleting}>
          <div className={styles.confirmBody}>
            <p>
              Chiến dịch <strong>{deleteTarget.name}</strong> sẽ bị xóa khỏi hệ thống. Các voucher liên quan sẽ không còn thuộc chiến dịch này.
            </p>
            <div className={styles.modalActions}>
              <Button type="button" className="btn-secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Hủy
              </Button>
              <Button type="button" className={styles.disableButton} onClick={confirmDelete} loading={deleting}>
                Xóa chiến dịch
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
