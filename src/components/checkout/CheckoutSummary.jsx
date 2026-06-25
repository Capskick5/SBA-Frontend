import Button from '../ui/Button';
import { formatCurrency } from '../../utils/formatters';

export default function CheckoutSummary({ preview, onPay }) {
  return (
    <aside className="summary">
      <h3>Checkout Summary</h3>
      <p>Selected items: {preview.items.length}</p>
      <p>Subtotal: {formatCurrency(preview.subtotal)}</p>
      <p>Shipping fee: {formatCurrency(preview.shippingFee)}</p>
      <h3>Total: {formatCurrency(preview.total)}</h3>
      <p>Payment method: {preview.paymentMethod || 'PAYOS'}</p>
      <Button onClick={onPay} disabled={!preview.address || !preview.items.length}>Proceed to payment</Button>
    </aside>
  );
}
