import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { paymentService } from '../../services/paymentService';
import { voucherService } from '../../services/voucherService';
import { formatCurrency } from '../../utils/formatters';
import { clearPendingPaymentCache } from '../../utils/pendingOrderGuard';
import { CheckCircle, XCircle, Loader2, Home, ShoppingBag, TicketPercent } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

function formatVoucherDiscount(voucher) {
  if (!voucher) return '';
  if (voucher.discountType === 'PERCENTAGE') {
    return `${voucher.discountValue}% giảm`;
  }
  return `Giảm ${formatCurrency(voucher.discountValue)}`;
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
        if (isPaid) {
          clearPendingPaymentCache();
        }
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
              <h2 style={{ fontSize: '1.5rem', color: '#1f2937', margin: '0 0 8px 0' }}>Đang xác minh thanh toán</h2>
              <p style={{ color: '#6b7280', margin: 0 }}>Vui lòng đợi trong giây lát, chúng tôi đang xác nhận giao dịch của bạn...</p>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <CheckCircle size={72} color="#10b981" />
            <div>
              <h2 style={{ fontSize: '1.8rem', color: '#10b981', margin: '0 0 8px 0' }}>Thanh toán thành công!</h2>
              <p style={{ color: '#374151', margin: '0 0 4px 0', fontSize: '1.1rem' }}>Cảm ơn bạn đã mua sắm tại BookVerse.</p>
              <p style={{ color: '#6b7280', margin: 0, fontSize: '0.95rem' }}>Đơn hàng của bạn đã được xử lý và đang được chuẩn bị.</p>
            </div>
            {isLoggedIn && (
              <div className="payment-voucher-reward">
                <div className="payment-voucher-icon">
                  <TicketPercent size={22} />
                </div>
                <div>
                  <span>Ưu đãi cho đơn tiếp theo</span>
                  {availableVoucher ? (
                    <>
                      <strong>{availableVoucher.code}</strong>
                      <p>
                        {formatVoucherDiscount(availableVoucher)} cho lần thanh toán đủ điều kiện tiếp theo.
                      </p>
                    </>
                  ) : (
                    <>
                      <strong>Kiểm tra ví mã giảm giá</strong>
                      <p>
                        Nếu đơn này đủ điều kiện, mã giảm giá cho đơn tiếp theo sẽ xuất hiện trong Mã giảm giá của tôi.
                      </p>
                    </>
                  )}
                </div>
                <Link to="/profile?tab=vouchers">Xem mã giảm giá</Link>
              </div>
            )}
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', width: '100%', marginTop: '12px' }}>
              <Link to="/" style={{ flex: 1, textDecoration: 'none' }}>
                <Button className="payment-btn-secondary" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                  <Home size={18} /> Trang chủ
                </Button>
              </Link>
              <Link to={isLoggedIn ? '/orders' : '/'} style={{ flex: 1, textDecoration: 'none' }}>
                <Button style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                  <ShoppingBag size={18} /> {isLoggedIn ? 'Đơn hàng' : 'Mua ngay'}
                </Button>
              </Link>
            </div>
          </div>
        )}

        {status === 'failed' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <XCircle size={72} color="#ef4444" />
            <div>
              <h2 style={{ fontSize: '1.8rem', color: '#ef4444', margin: '0 0 8px 0' }}>Thanh toán thất bại</h2>
              <p style={{ color: '#374151', margin: '0 0 4px 0', fontSize: '1.1rem' }}>Chúng tôi không thể xử lý thanh toán của bạn.</p>
              <p style={{ color: '#6b7280', margin: 0, fontSize: '0.95rem' }}>Vui lòng kiểm tra phương thức thanh toán hoặc thử lại sau.</p>
            </div>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', width: '100%', marginTop: '12px' }}>
              <Link to="/" style={{ flex: 1, textDecoration: 'none' }}>
                <Button className="payment-btn-secondary" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                  <Home size={18} /> Trang chủ
                </Button>
              </Link>
              <Link to={isLoggedIn ? '/orders' : '/'} style={{ flex: 1, textDecoration: 'none' }}>
                <Button style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                  <ShoppingBag size={18} /> {isLoggedIn ? 'Đơn hàng' : 'Mua ngay'}
                </Button>
              </Link>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
