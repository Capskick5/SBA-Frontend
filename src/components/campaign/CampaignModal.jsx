import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Gift, Check, X, Tag as TagIcon, ArrowRight, Lock, Layers } from 'lucide-react';
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

  const currentUser = authService.getCurrentUser();
  const isLoggedIn = Boolean(currentUser);

  useEffect(() => {
    if (!isOpen) return;
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    const loadData = async () => {
      try {
        const [cList, vResult, mineList] = await Promise.all([
          campaignService.getActiveCampaigns().catch(() => []),
          voucherService.getAvailablePage({ page: 0, size: 100 }).catch(() => ({ items: [] })),
          voucherService.listMine().catch(() => []),
        ]);

        if (!active) return;

        // Public promotional campaigns (Flash Sale)
        const publicPromotionalCampaigns = (cList || []).filter(
          (c) => c.campaignType === 'FLASH_SALE' || (!c.isAutoDistributed && c.campaignType !== 'WELCOME_GIFT')
        );

        setCampaigns(publicPromotionalCampaigns);
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
  }, [isOpen, isLoggedIn]);

  if (!isOpen) return null;

  const handleClaim = async (voucher) => {
    if (!isLoggedIn) {
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

  // Filter 2: VOUCHERS MUST BELONG TO AN ACTIVE CAMPAIGN to be displayed
  const campaignVouchersOnly = activeUnexpiredVouchers.filter((v) => {
    if (!v.campaignId && !v.campaignName) return false;
    const matchCampaign = campaigns.some(
      (c) => String(c.id) === String(v.campaignId) || (v.campaignName && c.name.toLowerCase() === v.campaignName.toLowerCase())
    );
    return matchCampaign;
  });

  // Filter 3: Filter by selected Admin Campaign tab
  const filteredVouchers = campaignVouchersOnly.filter((v) => {
    if (selectedCampaignId === 'ALL') return true;
    const matchCampaignId = String(v.campaignId) === String(selectedCampaignId);
    const targetCampaign = campaigns.find((c) => String(c.id) === String(selectedCampaignId));
    const matchName = targetCampaign && (v.campaignName || '').toLowerCase() === targetCampaign.name.toLowerCase();
    return matchCampaignId || matchName;
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

        {!isLoggedIn ? (
          /* Guest Screen */
          <div className="campaign-modal-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 24px' }}>
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', maxWidth: '440px' }}>
              <div style={{ width: '68px', height: '68px', borderRadius: '50%', background: '#fef0eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fb6376', boxShadow: '0 4px 14px rgba(251, 99, 118, 0.15)' }}>
                <Lock size={32} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--text)' }}>
                Đăng Nhập Để Xem Kho Voucher
              </h3>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.92rem', lineHeight: '1.6' }}>
                Vui lòng đăng nhập tài khoản của bạn để khám phá các chương trình ưu đãi độc quyền và thu thập mã giảm giá về ví cá nhân!
              </p>
              <Button
                type="button"
                style={{ background: 'linear-gradient(135deg, #fb6376 0%, #e11d48 100%)', color: '#ffffff', fontWeight: 700, padding: '12px 32px', borderRadius: '12px', marginTop: '6px' }}
                onClick={() => {
                  onClose();
                  navigate(`/login?redirect=${encodeURIComponent('/')}`);
                }}
              >
                Đăng nhập ngay <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        ) : (
          /* Logged In View */
          <>
            {/* Dynamic Admin Campaign Tabs (Only active campaigns) */}
            <div className="campaign-modal-toolbar" style={{ padding: '12px 28px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
              <div className="campaign-modal-tabs" style={{ padding: 0, border: 'none' }}>
                <button
                  type="button"
                  className={`campaign-tab ${selectedCampaignId === 'ALL' ? 'active' : ''}`}
                  onClick={() => setSelectedCampaignId('ALL')}
                >
                  <Layers size={15} /> Tất cả ({campaignVouchersOnly.length})
                </button>

                {/* Each tag represents a Flash Sale / Promotional Admin Campaign */}
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

                    // Match exact Campaign Name for badge tag
                    const parentCampaign = campaigns.find(
                      (c) => String(c.id) === String(voucher.campaignId)
                    );
                    const campaignTag = parentCampaign?.name || voucher.campaignName || 'Campaign Khuyến Mãi';

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
                  <p>Hiện chưa có mã voucher nào thuộc campaign này. Bạn có thể chọn tab Tất cả!</p>
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
          </>
        )}
      </div>
    </div>
  );
}
