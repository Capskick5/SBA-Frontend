import { Link, useSearchParams } from 'react-router-dom';
import Button from '../../components/ui/Button';

export default function PaymentResultPage() {
  const [params] = useSearchParams();
  const status = params.get('status') || 'pending';
  return (
    <section className="narrow stack">
      <h1>Payment Result</h1>
      <div className="panel">
        <p>Status: <strong>{status}</strong></p>
        <p>This screen supports mock states for success, failed, cancelled, and pending.</p>
      </div>
      <div className="actions">
        <Link to="/orders/1001"><Button>View Order</Button></Link>
        <Link to="/"><Button>Back Home</Button></Link>
      </div>
    </section>
  );
}
