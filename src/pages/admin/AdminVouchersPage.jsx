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
  if (rule.discountType === 'PERCENTAGE') return `${rule.discountValue}% `;
  return `${formatCurrency(rule.discountValue)} `;
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
  const [editingRuleId, setEditingRuleId] = useState(null);
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
        setError(getErrorMessage(err, 'Không thể tải quy tắc voucher.'));
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
    setEditingRuleId(null);
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
    setEditingRuleId(null);
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (rule) => {
    setForm({
      name: rule.name,
      codePrefix: rule.codePrefix || '',
      discountType: rule.discountType || 'FIXED',
      discountValue: String(rule.discountValue ?? ''),
      tierMinAmount: String(rule.tierMinAmount ?? ''),
      active: rule.active,
    });
    setEditingRuleId(rule.id);
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
      setFormError('Nhập tên quy tắc và giá trị giảm giá dương.');
      return;
    }
    if (!Number.isFinite(tierMinAmount) || tierMinAmount < 0) {
      setFormError('Giá trị đơn hàng tối thiểu không được âm.');
      return;
    }
    if (form.discountType === 'PERCENTAGE' && discountValue > 100) {
      setFormError('Giảm giá theo phần trăm không được vượt quá 100%.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const payload = {
        name: form.name.trim(),
        codePrefix: form.codePrefix.trim() || null,
        discountType: form.discountType,
        discountValue,
        tierMinAmount,
        active: form.active,
      };

      if (editingRuleId) {
        await adminService.updateVoucherRule(editingRuleId, payload);
        showToast('Đã cập nhật quy tắc voucher.');
      } else {
        await adminService.createVoucherRule(payload);
        showToast('Đã tạo quy tắc voucher.');
      }
      setFormOpen(false);
      if (currentPage === 0) {
        reloadRules();
      } else {
        changePage(0);
      }
    } catch (err) {
      setFormError(getErrorMessage(err, 'Không thể tạo quy tắc voucher.'));
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
      showToast('Đã vô hiệu hóa quy tắc voucher.');
      reloadRules();
    } catch (err) {
      showToast(getErrorMessage(err, 'Không thể vô hiệu hóa quy tắc voucher.'), 'error');
    } finally {
      setDisabling(false);
    }
  };

  const enableRule = async (rule) => {
    try {
      await adminService.updateVoucherRule(rule.id, {
        ...rule,
        active: true,
      });
      showToast('Đã kích hoạt quy tắc voucher.');
      reloadRules();
    } catch (err) {
      showToast(getErrorMessage(err, 'Không thể kích hoạt quy tắc voucher.'), 'error');
    }
  };

  const columns = [
    { key: 'name', label: 'Tên quy tắc' },
    { key: 'reward', label: 'Phần thưởng', render: formatReward },
    {
      key: 'tierMinAmount',
      label: 'Đơn hàng tối thiểu',
      render: (rule) => formatCurrency(rule.tierMinAmount),
    },
    { key: 'codePrefix', label: 'Tiền tố mã', render: (rule) => rule.codePrefix || 'BV' },
    {
      key: 'active',
      label: 'Trạng thái',
      render: (rule) => (
        <span className={`${styles.status} ${rule.active ? styles.active : styles.disabled}`}>
          {rule.active ? 'Đang hiện' : 'Đã vô hiệu'}
        </span>
      ),
    },
    { key: 'updatedAt', label: 'Cập nhật lần cuối', render: (rule) => formatDateTime(rule.updatedAt) },
    {
      key: 'actions',
      label: 'Thao tác',
      render: (rule) => (
        <div className={styles.rowActions}>
          <Button type="button" className="btn-secondary" onClick={() => openEdit(rule)}>
            Sửa
          </Button>
          <Button type="button" className="btn-secondary" onClick={() => openClone(rule)}>
            <Copy size={15} /> Sao chép
          </Button>
          {rule.active ? (
            <Button type="button" className={styles.disableButton} onClick={() => setDisableTarget(rule)}>
              <Ban size={15} /> Vô hiệu
            </Button>
          ) : (
            <Button type="button" className="btn-secondary" onClick={() => enableRule(rule)}>
              Kích hoạt
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
          <span className={styles.kicker}>Khuyến mãi</span>
          <h1>Quy tắc voucher</h1>
          <p>Cấu hình quy tắc dùng để tặng voucher cho khách hàng trong tương lai.</p>
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus size={17} /> Tạo quy tắc
        </Button>
      </header>

      <div className={styles.toolbar}>
        <label className={styles.filterField}>
          <span>Trạng thái</span>
          <select
            value={filter}
            onChange={(event) => {
              setLoading(true);
              setError('');
              setFilter(event.target.value);
              setCurrentPage(0);
            }}
          >
            <option value="all">Tất cả quy tắc</option>
            <option value="active">Đang hiện</option>
            <option value="disabled">Đã vô hiệu</option>
          </select>
        </label>
        <div className={styles.rulePolicy}>
          <TicketPercent size={18} />
          <span>Voucher khách hàng hiện có không được quản lý từ trang này.</span>
        </div>
      </div>

      {loading ? (
        <LoadingState text="Đang tải quy tắc voucher..." />
      ) : error ? (
        <ErrorState text={error}>
          <Button type="button" onClick={reloadRules}>Thử lại</Button>
        </ErrorState>
      ) : (
        <>
          <Table columns={columns} rows={rules} emptyText="Không tìm thấy quy tắc voucher nào." />
          {rules.length > 0 && (
            <div className={styles.pagination}>
              <Button
                type="button"
                className="btn-secondary"
                disabled={currentPage === 0}
                onClick={() => changePage(currentPage - 1)}
              >
                Trước
              </Button>
              <span>Trang {currentPage + 1} / {totalPages}</span>
              <Button
                type="button"
                className="btn-secondary"
                disabled={currentPage >= totalPages - 1}
                onClick={() => changePage(currentPage + 1)}
              >
                Sau
              </Button>
            </div>
          )}
        </>
      )}

      {formOpen && (
        <Modal 
          title={editingRuleId ? 'Sửa quy tắc voucher' : 'Tạo quy tắc voucher'} 
          onClose={() => setFormOpen(false)}
          maxWidth="500px"
        >
          <form onSubmit={submitRule} className="stack">
            {formError && <div className={styles.formError}>{formError}</div>}
            <Input
              label="Tên quy tắc"
              value={form.name}
              onChange={(event) => setField('name', event.target.value)}
              placeholder="vd. Giảm 10% cho đơn trên 300.000 VND"
              required
            />
            <Input
              label="Tiền tố mã"
              value={form.codePrefix}
              onChange={(event) => setField('codePrefix', event.target.value.toUpperCase())}
              placeholder="vd. TIER3"
              maxLength={20}
            />
            <label className="field">
              <span>Loại giảm giá</span>
              <select value={form.discountType} onChange={(event) => setField('discountType', event.target.value)}>
                <option value="FIXED">Số tiền cố định</option>
                <option value="PERCENTAGE">Phần trăm</option>
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
                label="Giá trị đơn hàng tối thiểu (VND)"
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
              <span>Kích hoạt quy tắc này ngay</span>
            </label>
            <div className={styles.modalActions}>
              <Button type="button" className="btn-secondary" onClick={() => setFormOpen(false)} disabled={submitting}>
                Hủy
              </Button>
              <Button type="submit" loading={submitting}>
                {editingRuleId ? 'Lưu thay đổi' : 'Tạo quy tắc'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {disableTarget && (
        <Modal title="Vô hiệu hóa quy tắc voucher?" onClose={() => setDisableTarget(null)} hideClose={disabling}>
          <div className={styles.confirmBody}>
            <p>
              <strong>{disableTarget.name}</strong> sẽ không còn được chọn cho phần thưởng voucher trong tương lai.
            </p>
            <div className={styles.modalActions}>
              <Button type="button" className="btn-secondary" onClick={() => setDisableTarget(null)} disabled={disabling}>
                Giữ kích hoạt
              </Button>
              <Button type="button" className={styles.disableButton} onClick={confirmDisable} loading={disabling}>
                Vô hiệu hóa quy tắc
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
