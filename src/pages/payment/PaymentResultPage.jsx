import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { paymentService } from '../../services/paymentService';

export default function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const verify = async () => {
      try {
        const params = Object.fromEntries([...searchParams]);
        const result = await paymentService.verifyPayment(params);
        setStatus(result.status === 'PAID' ? 'success' : 'failed');
      } catch {
        setStatus('failed');
      }
    };
    verify();
  }, [searchParams]);

  if (status === 'loading') return <div>Verifying payment...</div>;

  return (
    <section className="center-panel">
      {status === 'success' ? (
        <>
          <h1 style={{ color: 'green' }}>Payment Successful</h1>
          <p>Thank you for shopping at BookVerse.</p>
        </>
      ) : (
        <>
          <h1 style={{ color: 'red' }}>Payment Failed</h1>
          <p>Please check your order or try again later.</p>
        </>
      )}
      <Link to="/orders"><Button>View My Orders</Button></Link>
    </section>
  );
}
