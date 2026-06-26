import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { paymentService } from '../../services/paymentService';

export default function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading, success, failed

  useEffect(() => {
    const verify = async () => {
      try {
        // Gửi toàn bộ query params sang cho backend verify
        const params = Object.fromEntries([...searchParams]);
        await paymentService.verifyPayment(params);
        setStatus('success');
      } catch (err) {
        setStatus('failed');
      }
    };
    verify();
  }, [searchParams]);

  if (status === 'loading') return <div>Đang xác thực thanh toán...</div>;

  return (
    <section className="center-panel">
      {status === 'success' ? (
        <>
          <h1 style={{ color: 'green' }}>Thanh toán thành công!</h1>
          <p>Cảm ơn bạn đã mua hàng tại BookVerse.</p>
        </>
      ) : (
        <>
          <h1 style={{ color: 'red' }}>Thanh toán thất bại!</h1>
          <p>Vui lòng kiểm tra lại đơn hàng hoặc thử lại sau.</p>
        </>
      )}
      <Link to="/orders"><Button>Xem đơn hàng của tôi</Button></Link>
    </section>
  );
}