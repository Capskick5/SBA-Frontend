import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TicketPercent, Gift } from 'lucide-react';
import Pagination from '../../components/catalog/Pagination';
import Button from '../../components/ui/Button';
import { ErrorState, LoadingState } from '../../components/ui/State';
import { voucherService } from '../../services/voucherService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { showToast } from '../../utils/toast';

function formatDiscount({ discountType, discountValue, maxDiscountAmount }) {
  if (discountType === 'PERCENTAGE') {
    const cap = maxDiscountAmount ? ` up to ${formatCurrency(maxDiscountAmount)}` : '';
    return `${discountValue}% off${cap}`;
  }
  return `${formatCurrency(discountValue)} off`;
}

function formatDate(value) {
  return formatDateTime(value, 'No expiry date');
}

const STATUS_LABEL = {
  UNUSED: 'Ready to use',
  USED: 'Used',
  EXPIRED: 'Expired',
};

export default function VouchersPage() {
  // Available vouchers to claim
  const [available, setAvailable] = useState([]);
  const [availableLoading, setAvailableLoading] = useState(true);
  const [claimingId, setClaimingId] = useState(null);

  // My claimed vouchers (wallet)
  const [vouchers, setVouchers] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const reloadAll = () => setReloadKey((value) => value + 1);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      setAvailableLoading(true);
      return voucherService
        .getAvailablePage({ page: 0, size: 12 })
        .then((result) => {
          if (active) setAvailable(result.items || []);
        })
        .catch(() => {
          if (active) setAvailable([]);
        })
        .finally(() => {
          if (active) setAvailableLoading(false);
        });
    });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      setLoading(true);
      setLoadError('');
      return voucherService
        .getMinePage({ page, size: 6 })
        .then((result) => {
          if (!active) return;
          setVouchers(result.items || []);
          setTotalPages(result.totalPages || 0);
          setTotalItems(result.totalItems || 0);
        })
        .catch((err) => {
          if (active) setLoadError(err.message || 'Không thể tải voucher.');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    });
    return () => {
      active = false;
    };
  }, [page, reloadKey]);

  const handleClaim = async (voucher) => {
    if (claimingId) return;
    setClaimingId(voucher.id);
    try {
      await voucherService.claim(voucher.id);
      showToast(`Voucher ${voucher.code} added to your wallet!`);
      setPage(0);
      reloadAll();
    } catch (err) {
      showToast(err?.message || 'Could not claim this voucher.', 'error');
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <section className="voucher-wallet">
      {/* Claim available vouchers */}
      <div className="voucher-wallet-hero">
        <div className="voucher-wallet-icon">
          <Gift size={28} />
        </div>
        <div>
          <h2>Available vouchers</h2>
          <p>Claim vouchers below to add them to your wallet, then apply them at checkout.</p>
        </div>
      </div>

      {availableLoading ? (
        <LoadingState text="Loading available vouchers..." />
      ) : available.length > 0 ? (
        <div className="voucher-wallet-grid">
          {available.map((voucher) => {
            const soldOut = voucher.totalQuantity != null
              && voucher.claimedQuantity != null
              && voucher.claimedQuantity >= voucher.totalQuantity;
            return (
              <article className="voucher-wallet-card" key={voucher.id}>
                <div className="voucher-card-main">
                  <span className="voucher-card-label">Voucher</span>
                  <strong>{formatDiscount(voucher)}</strong>
                  <p>{voucher.name}</p>
                </div>
                <div className="voucher-card-code">
                  <span>Voucher code</span>
                  <strong>{voucher.code}</strong>
                </div>
                <dl className="voucher-card-details">
                  <div>
                    <dt>Minimum subtotal</dt>
                    <dd>{formatCurrency(voucher.minOrderValue)}</dd>
                  </div>
                  <div>
                    <dt>Valid until</dt>
                    <dd>{formatDate(voucher.endTime)}</dd>
                  </div>
                </dl>
                <Button
                  type="button"
                  onClick={() => handleClaim(voucher)}
                  loading={claimingId === voucher.id}
                  disabled={soldOut || (claimingId && claimingId !== voucher.id)}
                >
                  {soldOut ? 'Fully claimed' : 'Claim voucher'}
                </Button>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="voucher-empty-card">
          <Gift size={34} />
          <h2>No vouchers available right now</h2>
          <p>Check back later — new vouchers appear during campaigns and special events.</p>
        </div>
      )}

      {/* My wallet */}
      <div className="voucher-wallet-hero" style={{ marginTop: '28px' }}>
        <div className="voucher-wallet-icon">
          <TicketPercent size={28} />
        </div>
        <div>
          <h2>My vouchers</h2>
          <p>Vouchers you have claimed. Select one during checkout before proceeding to payment.</p>
          <span className="voucher-wallet-count">{totalItems} in wallet</span>
        </div>
      </div>

      {loading ? (
        <LoadingState text="Loading your vouchers..." />
      ) : loadError ? (
        <ErrorState text={loadError}>
          <button className="btn" onClick={reloadAll}>Try again</button>
        </ErrorState>
      ) : vouchers.length > 0 ? (
        <>
          <div className="voucher-wallet-grid">
            {vouchers.map((voucher) => (
              <article
                className="voucher-wallet-card"
                key={voucher.id}
                style={voucher.status !== 'UNUSED' ? { opacity: 0.6 } : undefined}
              >
                <div className="voucher-card-main">
                  <span className="voucher-card-label">{STATUS_LABEL[voucher.status] || voucher.status}</span>
                  <strong>{formatDiscount(voucher)}</strong>
                  <p>{voucher.voucherName}</p>
                </div>
                <div className="voucher-card-code">
                  <span>Voucher code</span>
                  <strong>{voucher.voucherCode}</strong>
                </div>
                <dl className="voucher-card-details">
                  <div>
                    <dt>Minimum subtotal</dt>
                    <dd>{formatCurrency(voucher.minOrderValue)}</dd>
                  </div>
                  <div>
                    <dt>Expires</dt>
                    <dd>{formatDate(voucher.expiresAt)}</dd>
                  </div>
                </dl>
                {voucher.status === 'UNUSED' ? (
                  <Link className="voucher-use-link" to="/cart">
                    Use at checkout
                  </Link>
                ) : (
                  <span className="voucher-use-link" style={{ pointerEvents: 'none', opacity: 0.7 }}>
                    {STATUS_LABEL[voucher.status] || voucher.status}
                  </span>
                )}
              </article>
            ))}
          </div>
          <Pagination
            currentPage={page + 1}
            totalPages={totalPages}
            onPageChange={(nextPage) => setPage(nextPage - 1)}
          />
        </>
      ) : (
        <div className="voucher-empty-card">
          <TicketPercent size={34} />
          <h2>No vouchers in your wallet</h2>
          <p>Claim one from the available vouchers above, then use it during your next checkout.</p>
          <Link to="/orders">View my orders</Link>
        </div>
      )}
    </section>
  );
}
