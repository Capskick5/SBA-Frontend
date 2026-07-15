import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { paymentService } from '../../services/paymentService';
import { voucherService } from '../../services/voucherService';
import { formatCurrency } from '../../utils/formatters';
import { CheckCircle, XCircle, Loader2, Home, ShoppingBag, TicketPercent } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

function formatVoucherDiscount(voucher) {
  if (!voucher) return '';
  if (voucher.discountType === 'PERCENTAGE') {
    return `${voucher.discountValue}% off`;
  }
  return `${formatCurrency(voucher.discountValue)} off`;
}

export default function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [availableVoucher, setAvailableVoucher] = useState(null);
  const { user } = useAuth();
  const isLoggedIn = !!user;

  useEffect(() => {
    const verify = async () => {
      try {
        const params = Object.fromEntries([...searchParams]);
        const result = await paymentService.verifyPayment(params);
        const isPaid = result.status === 'PAID';
        setStatus(isPaid ? 'success' : 'failed');
        if (isPaid && isLoggedIn) {
          const vouchers = await voucherService.listMine().catch(() => []);
          setAvailableVoucher(vouchers[0] || null);
        }
      } catch {
        setStatus('failed');
      }
    };
    verify();
  }, [searchParams, isLoggedIn]);

  return (
    <>
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .animate-spin {
            animation: spin 1s linear infinite;
          }
          .payment-btn-secondary {
            background: #f3f4f6 !important;
            color: #374151 !important;
            border: 1px solid #e5e7eb !important;
          }
          .payment-btn-secondary:hover {
            background: #e5e7eb !important;
          }
        `}
      </style>
      <section className="center-panel" style={{ textAlign: 'center', padding: '60px 20px', maxWidth: '500px', margin: '40px auto', background: '#fff', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', border: '1px solid #f3f4f6' }}>
        {status === 'loading' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <Loader2 size={56} color="#3b82f6" className="animate-spin" />
            <div>
              <h2 style={{ fontSize: '1.5rem', color: '#1f2937', margin: '0 0 8px 0' }}>Verifying Payment</h2>
              <p style={{ color: '#6b7280', margin: 0 }}>Please wait a moment while we confirm your transaction...</p>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <CheckCircle size={72} color="#10b981" />
            <div>
              <h2 style={{ fontSize: '1.8rem', color: '#10b981', margin: '0 0 8px 0' }}>Payment Successful!</h2>
              <p style={{ color: '#374151', margin: '0 0 4px 0', fontSize: '1.1rem' }}>Thank you for shopping at BookVerse.</p>
              <p style={{ color: '#6b7280', margin: 0, fontSize: '0.95rem' }}>Your order has been processed and is now being prepared.</p>
            </div>
            {isLoggedIn && (
              <div className="payment-voucher-reward">
                <div className="payment-voucher-icon">
                  <TicketPercent size={22} />
                </div>
                <div>
                  <span>Next order reward</span>
                  {availableVoucher ? (
                    <>
                      <strong>{availableVoucher.code}</strong>
                      <p>
                        {formatVoucherDiscount(availableVoucher)} for your next eligible checkout.
                      </p>
                    </>
                  ) : (
                    <>
                      <strong>Check your voucher wallet</strong>
                      <p>
                        If this order is eligible, your next-order voucher will appear in My Vouchers.
                      </p>
                    </>
                  )}
                </div>
                <Link to="/profile?tab=vouchers">View vouchers</Link>
              </div>
            )}
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', width: '100%', marginTop: '12px' }}>
              <Link to="/" style={{ flex: 1, textDecoration: 'none' }}>
                <Button className="payment-btn-secondary" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                  <Home size={18} /> Home
                </Button>
              </Link>
              <Link to={isLoggedIn ? '/orders' : '/'} style={{ flex: 1, textDecoration: 'none' }}>
                <Button style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                  <ShoppingBag size={18} /> {isLoggedIn ? 'Orders' : 'Shop Now'}
                </Button>
              </Link>
            </div>
          </div>
        )}

        {status === 'failed' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <XCircle size={72} color="#ef4444" />
            <div>
              <h2 style={{ fontSize: '1.8rem', color: '#ef4444', margin: '0 0 8px 0' }}>Payment Failed</h2>
              <p style={{ color: '#374151', margin: '0 0 4px 0', fontSize: '1.1rem' }}>We couldn't process your payment.</p>
              <p style={{ color: '#6b7280', margin: 0, fontSize: '0.95rem' }}>Please check your payment method or try again later.</p>
            </div>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', width: '100%', marginTop: '12px' }}>
              <Link to="/" style={{ flex: 1, textDecoration: 'none' }}>
                <Button className="payment-btn-secondary" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                  <Home size={18} /> Home
                </Button>
              </Link>
              <Link to={isLoggedIn ? '/orders' : '/'} style={{ flex: 1, textDecoration: 'none' }}>
                <Button style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                  <ShoppingBag size={18} /> {isLoggedIn ? 'Orders' : 'Shop Now'}
                </Button>
              </Link>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
