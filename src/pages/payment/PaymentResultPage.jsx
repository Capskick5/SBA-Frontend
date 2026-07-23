import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { paymentService } from '../../services/paymentService';
import { voucherService } from '../../services/voucherService';
import { formatCurrency } from '../../utils/formatters';
import { clearPendingPaymentCache } from '../../utils/pendingOrderGuard';
import { Home, ShoppingBag, ArrowRight } from 'lucide-react';
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
  const [paymentResult, setPaymentResult] = useState(null);
  const [availableVoucher, setAvailableVoucher] = useState(null);
  const { user } = useAuth();
  const isLoggedIn = !!user;

  useEffect(() => {
    const verify = async () => {
      try {
        const params = Object.fromEntries([...searchParams]);
        const result = await paymentService.verifyPayment(params);
        setPaymentResult(result);
        const isPaid = result?.status === 'PAID';
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

  // Real orderId from backend response or URL param 'orderId'
  const orderId = paymentResult?.orderId || paymentResult?.id || searchParams.get('orderId');
  const amount = paymentResult?.amount || (searchParams.get('vnp_Amount') ? Number(searchParams.get('vnp_Amount')) / 100 : null);

  return (
    <div className="payment-result-container">
      <div className="payment-result-card">
        {status === 'loading' && (
          <div className="payment-result-header">
            <h2 className="payment-result-title is-loading">Đang xác minh thanh toán...</h2>
            <p className="payment-result-desc">
              Vui lòng chờ trong giây lát, chúng tôi đang kiểm tra trạng thái giao dịch của bạn.
            </p>
          </div>
        )}

        {status === 'success' && (
          <>
            <div className="payment-result-header">
              <h2 className="payment-result-title is-success">Thanh toán thành công!</h2>
              <p className="payment-result-subtitle">Cảm ơn bạn đã mua sắm tại BookVerse.</p>
              <p className="payment-result-desc">
                Đơn hàng của bạn đã được tiếp nhận thành công và đang trong quá trình chuẩn bị giao hàng.
              </p>
            </div>

            {(orderId || amount) && (
              <div className="payment-result-order-info">
                {orderId && <span>Mã đơn: <strong>#{orderId}</strong></span>}
                {orderId && amount && <span>•</span>}
                {amount && <span>Số tiền: <strong>{formatCurrency(amount)}</strong></span>}
              </div>
            )}

            {isLoggedIn && (
              <div className="payment-voucher-reward">
                <div className="payment-voucher-content">
                  <span className="payment-voucher-tag">Ưu đãi dành cho bạn</span>
                  {availableVoucher ? (
                    <>
                      <span className="payment-voucher-code">Mã: {availableVoucher.code}</span>
                      <p className="payment-voucher-desc">
                        {formatVoucherDiscount(availableVoucher)} cho đơn hàng tiếp theo.
                      </p>
                    </>
                  ) : (
                    <>
                      <span className="payment-voucher-code">Ví Voucher quà tặng</span>
                      <p className="payment-voucher-desc">
                        Kiểm tra ví voucher để nhận ưu đãi mới nhất từ BookVerse.
                      </p>
                    </>
                  )}
                </div>
                <Link to="/profile?tab=vouchers" className="payment-voucher-action">
                  Xem mã <ArrowRight size={14} />
                </Link>
              </div>
            )}

            <div className="payment-result-actions">
              <Link to="/" className="payment-btn-secondary">
                <Home size={18} /> Trang chủ
              </Link>
              <Link
                to={isLoggedIn ? '/profile?tab=orders' : '/'}
                className="payment-btn-primary"
              >
                <ShoppingBag size={18} /> {isLoggedIn ? 'Xem đơn hàng' : 'Khám phá sách'}
              </Link>
            </div>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="payment-result-header">
              <h2 className="payment-result-title is-failed">Thanh toán không thành công</h2>
              <p className="payment-result-subtitle">Rất tiếc, giao dịch của bạn đã bị từ chối hoặc gặp lỗi.</p>
              <p className="payment-result-desc">
                Vui lòng kiểm tra lại số dư tài khoản, thông tin thẻ hoặc thử thanh toán lại.
              </p>
            </div>

            <div className="payment-result-actions">
              <Link to="/" className="payment-btn-secondary">
                <Home size={18} /> Trang chủ
              </Link>
              <Link
                to={isLoggedIn ? '/profile?tab=orders' : '/cart'}
                className="payment-btn-primary"
              >
                <ShoppingBag size={18} /> {isLoggedIn ? 'Xem đơn hàng' : 'Về giỏ hàng'}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

