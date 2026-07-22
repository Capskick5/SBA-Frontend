import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Gift, Check, X, Tag as TagIcon, ArrowRight, Search } from 'lucide-react';
import Button from '../ui/Button';
import { LoadingState } from '../ui/State';
import { campaignService } from '../../services/campaignService';
import { voucherService } from '../../services/voucherService';
import { authService } from '../../services/authService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { showToast } from '../../utils/toast';

function formatDiscount(voucher) {
  if (voucher.discountType === 'PERCENTAGE') {
    const cap = voucher.maxDiscountAmount ? ` (Giảm tối đa ${formatCurrency(voucher.maxDiscountAmount)})` : '';
    return `Giảm ${voucher.discountValue}%${cap}`;
  }
  return `Giảm ${formatCurrency(voucher.discountValue || 0)}`;
}

function formatDate(iso) {
  if (!iso) return 'Không giới hạn thời gian';
  return formatDateTime(iso, 'Không giới hạn');
}

export default function CampaignModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [claimedCodes, setClaimedCodes] = useState([]);
  const [claimingId, setClaimingId] = useState(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setLoading(true);

    const loadData = async () => {
      try {
        const [cList, vResult, mineList] = await Promise.all([
          campaignService.getActiveCampaigns().catch(() => []),
          voucherService.getAvailablePage({ page: 0, size: 100 }).catch(() => ({ items: [] })),
          authService.getCurrentUser()
            ? voucherService.listMine().catch(() => [])
            : Promise.resolve([]),
        ]);

        if (!active) return;

        setCampaigns(cList || []);
        setVouchers(vResult.items || []);

        const mineCodes = (mineList || []).map((v) => (v.voucherCode || '').toUpperCase());
        setClaimedCodes(mineCodes);
      } catch (err) {
        console.error('Failed to load campaigns:', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClaim = async (voucher) => {
    if (!authService.getCurrentUser()) {
      showToast('Vui lòng đăng nhập để thu thập voucher vào ví cá nhân.', 'error');
      onClose();
      navigate(`/login?redirect=${encodeURIComponent('/')}`);
      return;
    }

    if (claimingId) return;
    setClaimingId(voucher.id);

    try {
      if (voucher.id) {
        await voucherService.claim(voucher.id);
      } else if (voucher.code) {
        await voucherService.claimByCode(voucher.code);
      }
      showToast(`🎉 Thu thập thành công mã voucher "${voucher.code || voucher.voucherCode}" vào ví!`);
      setClaimedCodes((prev) => [...prev, (voucher.code || voucher.voucherCode || '').toUpperCase()]);
    } catch (err) {
      const msg = err?.message || err?.response?.data?.message || 'Không thể thu thập mã này.';
      if (msg.includes('already claimed') || msg.includes('đã nhận') || msg.includes('đã lưu')) {
        showToast(`Bạn đã thu thập mã "${voucher.code || voucher.voucherCode}" trước đó.`);
        setClaimedCodes((prev) => [...prev, (voucher.code || voucher.voucherCode || '').toUpperCase()]);
      } else {
        showToast(msg, 'error');
      }
    } finally {
      setClaimingId(null);
    }
  };

  const displayVouchers = vouchers || [];

  // Filter 1: Hide EXPIRED vouchers completely
  const now = new Date();
  const activeUnexpiredVouchers = displayVouchers.filter((v) => {
    const expiryStr = v.endTime || v.expiresAt;
    if (!expiryStr) return true;
    const expiryDate = new Date(expiryStr);
    if (Number.isNaN(expiryDate.getTime())) return true;
    return expiryDate > now;
  });

  // Filter 2: Only 'ALL' tab and dynamic Admin Campaign tabs
  const filteredVouchers = activeUnexpiredVouchers.filter((v) => {
    if (selectedCampaignId !== 'ALL') {
      const matchCampaignId = String(v.campaignId) === String(selectedCampaignId);
      const targetCampaign = campaigns.find((c) => String(c.id) === String(selectedCampaignId));
      const matchName = targetCampaign && (v.campaignName || '').toLowerCase() === targetCampaign.name.toLowerCase();
      if (!matchCampaignId && !matchName) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const codeMatch = String(v.code || v.voucherCode || '').toLowerCase().includes(q);
      const nameMatch = String(v.name || v.voucherName || '').toLowerCase().includes(q);
      const campaignMatch = String(v.campaignName || '').toLowerCase().includes(q);
      if (!codeMatch && !nameMatch && !campaignMatch) return false;
    }

    return true;
  });

  return (
    <div className="campaign-fullscreen-modal">
      <div className="campaign-modal-backdrop" onClick={onClose} />
      <div className="campaign-modal-container">
        <header className="campaign-modal-header">
          <div>
            <div className="campaign-modal-kicker">
              <Sparkles size={16} /> KHO VOUCHER & CAMPAIGN KHUYẾN MÃI
            </div>
            <h2>Các Chương Trình Khuyến Mãi Đang Diễn Ra</h2>
            <p>Bấm "Thu thập" để lưu trực tiếp mã giảm giá vào ví voucher cá nhân của bạn!</p>
          </div>
          <button type="button" className="btn-modal-close" onClick={onClose} aria-label="Đóng">
            <X size={22} />
          </button>
        </header>

        {/* Campaign Search & Dynamic Admin Campaign Tabs */}
        <div className="campaign-modal-toolbar" style={{ padding: '12px 28px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="campaign-search-box" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f1f5f9', padding: '8px 14px', borderRadius: '8px' }}>
            <Search size={16} style={{ color: 'var(--muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo tên Campaign hoặc Mã voucher..."
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.88rem' }}
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
                <X size={14} />
              </button>
            )}
          </div>

          <div className="campaign-modal-tabs" style={{ padding: 0, border: 'none' }}>
            <button
              type="button"
              className={`campaign-tab ${selectedCampaignId === 'ALL' ? 'active' : ''}`}
              onClick={() => setSelectedCampaignId('ALL')}
            >
              <TagIcon size={15} /> Tất cả ({activeUnexpiredVouchers.length})
            </button>

            {/* Dynamic Admin Campaign Tabs Only */}
            {campaigns.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`campaign-tab ${selectedCampaignId === String(c.id) ? 'active' : ''}`}
                onClick={() => setSelectedCampaignId(String(c.id))}
              >
                <TagIcon size={15} /> {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Body / Voucher Cards Grid */}
        <div className="campaign-modal-body">
          {loading ? (
            <LoadingState text="Đang tải danh sách campaign và voucher..." />
          ) : filteredVouchers.length > 0 ? (
            <div className="campaign-vouchers-grid">
              {filteredVouchers.map((voucher) => {
                const codeUpper = (voucher.code || voucher.voucherCode || '').toUpperCase();
                const isClaimed = claimedCodes.includes(codeUpper);

                // Sold out check
                const isSoldOut = voucher.totalQuantity != null
                  && voucher.claimedQuantity != null
                  && voucher.claimedQuantity >= voucher.totalQuantity;

                const campaignTag = voucher.campaignName || (campaigns.find((c) => String(c.id) === String(voucher.campaignId))?.name) || 'Mã Ưu Đãi';

                return (
                  <article
                    key={voucher.id || voucher.code}
                    className={`campaign-voucher-card ${isSoldOut ? 'is-sold-out' : ''}`}
                  >
                    <div className="card-top-badge">
                      <span className="badge badge-brand"><TagIcon size={13} /> {campaignTag}</span>
                    </div>

                    <div className="card-main-info">
                      <h3>{voucher.name || `Voucher ${voucher.code}`}</h3>
                      <div className="discount-highlight">
                        {formatDiscount(voucher)}
                      </div>
                      <dl className="card-details-dl">
                        <div>
                          <dt>Mã voucher:</dt>
                          <dd><strong>{voucher.code}</strong></dd>
                        </div>
                        <div>
                          <dt>Đơn tối thiểu:</dt>
                          <dd>{formatCurrency(voucher.minOrderValue || 0)}</dd>
                        </div>
                        <div>
                          <dt>Hạn sử dụng:</dt>
                          <dd>{formatDate(voucher.endTime || voucher.expiresAt)}</dd>
                        </div>
                      </dl>
                    </div>

                    <div className="card-action-bar">
                      <button
                        type="button"
                        className={`btn-claim-campaign ${isClaimed ? 'is-claimed' : ''} ${isSoldOut ? 'is-disabled' : ''}`}
                        onClick={() => handleClaim(voucher)}
                        disabled={claimingId === voucher.id || isClaimed || isSoldOut}
                      >
                        {claimingId === voucher.id ? (
                          'Đang thu thập...'
                        ) : isClaimed ? (
                          <>
                            <Check size={16} /> Đã thu thập
                          </>
                        ) : isSoldOut ? (
                          'Đã hết lượt'
                        ) : (
                          <>
                            <Gift size={16} /> Thu thập voucher
                          </>
                        )}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="campaign-empty-inline" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
              <Gift size={36} style={{ marginBottom: '10px', opacity: 0.5 }} />
              <h3>Chưa có voucher phù hợp</h3>
              <p>Hiện chưa có mã voucher nào thuộc danh mục này. Bạn có thể mở danh mục Tất cả!</p>
            </div>
          )}
        </div>

        <footer className="campaign-modal-footer">
          <span>Tất cả voucher đã thu thập sẽ được tự động lưu vào ví của bạn.</span>
          <Button
            type="button"
            className="btn-secondary"
            onClick={() => {
              onClose();
              navigate('/profile?tab=vouchers');
            }}
          >
            Quản lý Ví Voucher <ArrowRight size={16} />
          </Button>
        </footer>
      </div>
    </div>
  );
}
