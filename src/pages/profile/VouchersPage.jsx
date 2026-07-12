import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TicketPercent } from 'lucide-react';
import { ErrorState, LoadingState } from '../../components/ui/State';
import { voucherService } from '../../services/voucherService';
import { formatCurrency } from '../../utils/formatters';

function formatVoucherDiscount(voucher) {
  if (voucher.discountType === 'PERCENTAGE') {
    return `${voucher.discountValue}% off`;
  }
  return `${formatCurrency(voucher.discountValue)} off`;
}

function formatVoucherDate(value) {
  if (!value) return 'No expiry date';
  return new Date(value).toLocaleString('en-GB');
}

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      setLoading(true);
      setLoadError('');

      return voucherService
        .listMine()
        .then((items) => {
          if (active) setVouchers(items || []);
        })
        .catch((err) => {
          if (active) setLoadError(err.message || 'Could not load vouchers.');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  if (loading) return <LoadingState text="Loading your vouchers..." />;
  if (loadError) return <ErrorState text={loadError}><button className="btn" onClick={() => setReloadKey((value) => value + 1)}>Try again</button></ErrorState>;

  return (
    <section className="voucher-wallet">
      <div className="voucher-wallet-hero">
        <div className="voucher-wallet-icon">
          <TicketPercent size={28} />
        </div>
        <div>
          <h2>My vouchers</h2>
          <p>
            Vouchers are awarded after eligible paid orders. Use them on your next checkout
            before proceeding to payment.
          </p>
        </div>
      </div>

      {vouchers.length > 0 ? (
        <div className="voucher-wallet-grid">
          {vouchers.map((voucher) => (
            <article className="voucher-wallet-card" key={voucher.id}>
              <div className="voucher-card-main">
                <span className="voucher-card-label">Available voucher</span>
                <strong>{formatVoucherDiscount(voucher)}</strong>
                <p>{voucher.name}</p>
              </div>
              <div className="voucher-card-code">
                <span>Voucher code</span>
                <strong>{voucher.code}</strong>
              </div>
              <dl className="voucher-card-details">
                <div>
                  <dt>Minimum subtotal</dt>
                  <dd>{formatCurrency(voucher.tierMinAmount)}</dd>
                </div>
                <div>
                  <dt>Expires</dt>
                  <dd>{formatVoucherDate(voucher.expiresAt)}</dd>
                </div>
              </dl>
              <Link className="voucher-use-link" to="/cart">
                Use at checkout
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="voucher-empty-card">
          <TicketPercent size={34} />
          <h2>No vouchers yet</h2>
          <p>
            Complete a paid order first. If the order is eligible, your voucher will appear
            here and can be selected during your next checkout.
          </p>
          <Link to="/orders">View my orders</Link>
        </div>
      )}
    </section>
  );
}
