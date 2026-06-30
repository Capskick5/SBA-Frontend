import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { paymentService } from '../../services/paymentService';
import { CheckCircle, XCircle, Loader2, Home, ShoppingBag } from 'lucide-react';

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
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', width: '100%', marginTop: '12px' }}>
              <Link to="/" style={{ flex: 1, textDecoration: 'none' }}>
                <Button className="payment-btn-secondary" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                  <Home size={18} /> Home
                </Button>
              </Link>
              <Link to="/orders" style={{ flex: 1, textDecoration: 'none' }}>
                <Button style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                  <ShoppingBag size={18} /> Orders
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
              <Link to="/orders" style={{ flex: 1, textDecoration: 'none' }}>
                <Button style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                  <ShoppingBag size={18} /> Orders
                </Button>
              </Link>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
