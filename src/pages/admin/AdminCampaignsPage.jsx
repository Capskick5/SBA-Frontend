import { useEffect, useState, useRef } from 'react';
import { Plus, Trash2, Megaphone, Check, Search, Tag as TagIcon, Layers, Sparkles, ChevronDown } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Table from '../../components/ui/Table';
import AdminPageHeader from '../../components/ui/AdminPageHeader';
import AdminToolbar from '../../components/ui/AdminToolbar';
import AdminPagination from '../../components/ui/AdminPagination';
import { ErrorState, LoadingState } from '../../components/ui/State';
import { adminService } from '../../services/adminService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
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
  voucherIds: [],
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

function CampaignVouchersDropdown({ campaign, allVouchers }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const campaignVouchers = allVouchers.filter((v) => String(v.campaignId) === String(campaign.id));

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (campaignVouchers.length === 0) {
    return <span style={{ color: '#94a3b8', fontSize: '0.82rem', fontStyle: 'italic' }}>Chưa đính kèm mã</span>;
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '8px',
          background: open ? '#eff6ff' : '#ffffff',
          border: open ? '1.5px solid #3b82f6' : '1px solid #cbd5e1',
          color: open ? '#1d4ed8' : '#1e293b',
          fontSize: '0.82rem',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        <TagIcon size={14} style={{ color: open ? '#2563eb' : '#fb6376' }} />
        <span>{campaignVouchers.length} mã voucher</span>
        <ChevronDown
          size={14}
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            color: '#64748b',
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 100,
            width: '290px',
            maxHeight: '260px',
            overflowY: 'auto',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.06)',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', padding: '2px 4px 6px 4px', borderBottom: '1px solid #f1f5f9' }}>
            DANH SÁCH MÃ VOUCHER ({campaignVouchers.length})
          </div>

          {campaignVouchers.map((v) => {
            const discountText = v.discountType === 'PERCENTAGE'
              ? `Giảm ${v.discountValue}%`
              : `Giảm ${formatCurrency(v.discountValue || 0)}`;

            return (
              <div
                key={v.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'space-between',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  background: '#f8fafc',
                  border: '1px solid #f1f5f9',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#e0f2fe', color: '#0369a1', fontSize: '0.75rem', fontWeight: 800 }}>
                      {v.code}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#334155', marginTop: '2px', fontWeight: 500 }}>
                    {v.name}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '1px' }}>
                    Đơn từ: {formatCurrency(v.minOrderValue || 0)}
                  </div>
                </div>
                <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#e11d48', whiteSpace: 'nowrap' }}>
                  {discountText}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [allVouchers, setAllVouchers] = useState([]);
  const [availableVouchers, setAvailableVouchers] = useState([]);
  const [loadingVouchers, setLoadingVouchers] = useState(false);
  const [voucherSearch, setVoucherSearch] = useState('');
  const [voucherFilterTab, setVoucherFilterTab] = useState('ALL'); // 'ALL' | 'SELECTED'
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
    Promise.all([
      adminService.getCampaigns({ page: currentPage, size: PAGE_SIZE, sort: 'createdAt,desc' }),
      adminService.getVouchers({ page: 0, size: 200 }),
    ])
      .then(([page, voucherRes]) => {
        if (!activeRequest) return;
        setCampaigns(Array.isArray(page?.items) ? page.items : []);
        setTotalPages(Math.max(page?.totalPages || 1, 1));
        const vItems = voucherRes?.items || voucherRes?.content || [];
        setAllVouchers(vItems);
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

  const isVoucherSelected = (voucherId) => {
    return form.voucherIds.some((id) => String(id) === String(voucherId));
  };

  // Load vouchers: unassigned OR belonging to the campaign being edited
  const loadVouchersForForm = async (targetCampaignId = null) => {
    setLoadingVouchers(true);
    setVoucherSearch('');
    setVoucherFilterTab('ALL');
    try {
      const res = await adminService.getVouchers({ page: 0, size: 200 });
      const items = res?.items || res?.content || [];
      setAllVouchers(items);

      if (targetCampaignId) {
        const attachedIds = items
          .filter((v) => String(v.campaignId) === String(targetCampaignId))
          .map((v) => Number(v.id));
        setForm((prev) => ({ ...prev, voucherIds: attachedIds }));
      }

      // Show: vouchers with no campaign, OR vouchers already in this campaign
      const eligible = items.filter(
        (v) => !v.campaignId || (targetCampaignId && String(v.campaignId) === String(targetCampaignId))
      );
      setAvailableVouchers(eligible);
    } catch {
      setAvailableVouchers([]);
    } finally {
      setLoadingVouchers(false);
    }
  };

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
    loadVouchersForForm(null);
  };

  const openEdit = (campaign) => {
    const attachedVouchers = allVouchers.filter((v) => String(v.campaignId) === String(campaign.id));
    const attachedVoucherIds = attachedVouchers.map((v) => Number(v.id));

    setForm({
      name: campaign.name || '',
      campaignType: campaign.campaignType || 'FLASH_SALE',
      isAutoDistributed: Boolean(campaign.isAutoDistributed),
      startTime: toLocalInput(campaign.startTime),
      endTime: toLocalInput(campaign.endTime),
      status: campaign.status || 'ACTIVE',
      voucherIds: attachedVoucherIds,
    });
    setEditingId(campaign.id);
    setFormError('');
    setFormOpen(true);
    loadVouchersForForm(campaign.id);
  };

  const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }));

  const toggleVoucherSelect = (voucherId) => {
    const numId = Number(voucherId);
    setForm((prev) => {
      const exists = prev.voucherIds.some((id) => String(id) === String(voucherId));
      const updated = exists
        ? prev.voucherIds.filter((id) => String(id) !== String(voucherId))
        : [...prev.voucherIds, numId];
      return { ...prev, voucherIds: updated };
    });
  };

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

    const endTime = toInstant(form.endTime);
    if (endTime && new Date(endTime) <= new Date(startTime)) {
      setFormError('Thời gian kết thúc phải diễn ra sau thời gian bắt đầu.');
      return;
    }

    const normalizedVoucherIds = form.voucherIds
      .map((id) => Number(id))
      .filter((id) => !isNaN(id));

    const payload = {
      name: form.name.trim(),
      campaignType: form.campaignType,
      isAutoDistributed: form.isAutoDistributed,
      startTime,
      endTime,
      status: form.status,
      voucherIds: normalizedVoucherIds,
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
      reload();
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

  // Filter vouchers inside form modal
  const filteredModalVouchers = availableVouchers.filter((v) => {
    const isSelected = isVoucherSelected(v.id);
    if (voucherFilterTab === 'SELECTED' && !isSelected) return false;

    if (voucherSearch.trim()) {
      const q = voucherSearch.trim().toLowerCase();
      const codeMatch = String(v.code || '').toLowerCase().includes(q);
      const nameMatch = String(v.name || '').toLowerCase().includes(q);
      if (!codeMatch && !nameMatch) return false;
    }
    return true;
  });

  const columns = [
    { key: 'name', label: 'Tên chiến dịch', render: (c) => <strong>{c.name}</strong> },
    { key: 'campaignType', label: 'Phân loại', render: (c) => TYPE_LABELS[c.campaignType] || c.campaignType },
    {
      key: 'isAutoDistributed',
      label: 'Cách phân phối',
      render: (c) => (c.isAutoDistributed ? 'Tự động gửi' : 'Khách tự thu thập'),
    },
    {
      key: 'vouchers',
      label: 'Danh sách Voucher đính kèm',
      render: (c) => <CampaignVouchersDropdown campaign={c} allVouchers={allVouchers} />,
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

  // minNow kept for potential future use but no longer applied to date inputs

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
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '40px' }}>
          <Table columns={columns} rows={campaigns} emptyText="Chưa có chiến dịch nào." />
          {campaigns.length > 0 && (
            <div style={{ marginTop: '140px' }}>
              <AdminPagination
                page={currentPage}
                totalPages={totalPages}
                onPageChange={changePage}
              />
            </div>
          )}
        </div>
      )}

      {formOpen && (
        <Modal
          title={editingId ? 'Chỉnh sửa chiến dịch' : 'Tạo chiến dịch mới'}
          onClose={() => setFormOpen(false)}
          maxWidth="680px"
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
              <select
                value={form.campaignType}
                onChange={(event) => {
                  const newType = event.target.value;
                  setForm((prev) => ({
                    ...prev,
                    campaignType: newType,
                    // WELCOME_GIFT should always be auto-distributed
                    isAutoDistributed: newType === 'WELCOME_GIFT' ? true : prev.isAutoDistributed,
                  }));
                }}
              >
                <option value="FLASH_SALE">Giờ vàng (Flash Sale)</option>
                <option value="WELCOME_GIFT">Thành viên mới (Chào mừng)</option>
              </select>
            </label>

            {/* Stacked date inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <Input
                label="Thời gian bắt đầu"
                type="datetime-local"
                value={form.startTime}
                onChange={(event) => setField('startTime', event.target.value)}
                required
              />
              <Input
                label="Thời gian kết thúc (để trống = không giới hạn)"
                type="datetime-local"
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
              <span>
                Tự động phát voucher khi đăng ký tài khoản mới
                <small style={{ display: 'block', color: '#64748b', fontWeight: 400, marginTop: '2px' }}>
                  Chỉ áp dụng cho loại "Thành viên mới" — voucher sẽ tự động vào ví khi user đăng ký
                </small>
              </span>
            </label>

            {/* Modern Production-Grade Voucher Picker UI */}
            <div style={{
              marginTop: '12px',
              padding: '16px',
              borderRadius: '12px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} style={{ color: '#fb6376' }} />
                  <strong style={{ fontSize: '0.96rem', color: '#0f172a' }}>
                    Gắn Mã Voucher Vào Chiến Dịch
                  </strong>
                </div>
                <span style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  padding: '4px 12px',
                  borderRadius: '20px',
                  background: form.voucherIds.length > 0 ? '#fef2f2' : '#f1f5f9',
                  color: form.voucherIds.length > 0 ? '#e11d48' : '#64748b',
                  border: form.voucherIds.length > 0 ? '1px solid #fecdd3' : '1px solid #cbd5e1',
                }}>
                  🎯 Đã chọn: {form.voucherIds.length} mã
                </span>
              </div>

              {/* Modal Toolbar: Search & Tab Filter */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', alignItems: 'center' }}>
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '6px 12px',
                }}>
                  <Search size={15} style={{ color: '#94a3b8' }} />
                  <input
                    type="text"
                    value={voucherSearch}
                    onChange={(e) => setVoucherSearch(e.target.value)}
                    placeholder="Tìm theo mã hoặc tên voucher..."
                    style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '4px', background: '#e2e8f0', padding: '3px', borderRadius: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setVoucherFilterTab('ALL')}
                    style={{
                      border: 'none',
                      background: voucherFilterTab === 'ALL' ? '#ffffff' : 'transparent',
                      color: voucherFilterTab === 'ALL' ? '#0f172a' : '#64748b',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      padding: '5px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    Tất cả ({availableVouchers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoucherFilterTab('SELECTED')}
                    style={{
                      border: 'none',
                      background: voucherFilterTab === 'SELECTED' ? '#ffffff' : 'transparent',
                      color: voucherFilterTab === 'SELECTED' ? '#e11d48' : '#64748b',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      padding: '5px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    Đã chọn ({form.voucherIds.length})
                  </button>
                </div>
              </div>

              {/* Voucher Visual Cards List */}
              {loadingVouchers ? (
                <div style={{ textAlign: 'center', padding: '24px', fontSize: '0.86rem', color: '#64748b' }}>
                  Đang tải danh sách voucher khả dụng...
                </div>
              ) : filteredModalVouchers.length > 0 ? (
                <div style={{
                  maxHeight: '220px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  paddingRight: '4px',
                }}>
                  {filteredModalVouchers.map((v) => {
                    const isSelected = isVoucherSelected(v.id);
                    const discountText = v.discountType === 'PERCENTAGE'
                      ? `Giảm ${v.discountValue}%`
                      : `Giảm ${formatCurrency(v.discountValue || 0)}`;

                    return (
                      <div
                        key={v.id}
                        onClick={() => toggleVoucherSelect(v.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justify: 'space-between',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          background: isSelected ? '#fff1f2' : '#ffffff',
                          border: isSelected ? '1.5px solid #fb6376' : '1px solid #e2e8f0',
                          boxShadow: isSelected ? '0 2px 8px rgba(251, 99, 118, 0.12)' : 'none',
                          cursor: 'pointer',
                          userSelect: 'none',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            background: isSelected ? '#fb6376' : '#f1f5f9',
                            color: isSelected ? '#ffffff' : '#1e293b',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            letterSpacing: '0.5px',
                          }}>
                            {v.code}
                          </span>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#0f172a' }}>
                              {v.name}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                              Đơn tối thiểu: {formatCurrency(v.minOrderValue || 0)}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#e11d48' }}>
                            {discountText}
                          </span>
                          <button
                            type="button"
                            style={{
                              border: 'none',
                              background: isSelected ? '#e11d48' : '#f1f5f9',
                              color: isSelected ? '#ffffff' : '#475569',
                              padding: '5px 12px',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            {isSelected ? (
                              <>
                                <Check size={14} /> Đã chọn
                              </>
                            ) : (
                              <>
                                <Plus size={14} /> Chọn
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px', color: '#64748b', fontSize: '0.86rem' }}>
                  {voucherFilterTab === 'SELECTED'
                    ? 'Chưa chọn mã voucher nào.'
                    : 'Không tìm thấy voucher khả dụng phù hợp.'}
                </div>
              )}
            </div>

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
