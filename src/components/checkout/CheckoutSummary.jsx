import Button from '../ui/Button';
import { formatCurrency } from '../../utils/formatters';

export default function CheckoutSummary({
  preview,
  onPay,
  canPay = false,
  disabledReason = '',
  loading = false,
  giftWrapFee = 0,
  giftFeeSupported = false,
}) {
  const hasShippingFee = typeof preview.shippingFee === 'number';
  const hasGiftWrapFee = giftWrapFee > 0;
  const displayTotal = hasShippingFee ? preview.total + giftWrapFee : null;

  return (
    <aside className="summary checkout-summary-card">
      <div>
        <span className="summary-kicker">Order summary</span>
        <h3>Checkout Summary</h3>
      </div>

      <div className="checkout-summary-items">
        {loading ? (
          <p className="muted">Loading selected books...</p>
        ) : preview.items.length > 0 ? (
          preview.items.map((item) => (
            <div className="checkout-summary-item" key={`${item.bookId}-${item.title}`}>
              <div>
                <strong>{item.title}</strong>
                <span className="checkout-summary-item-meta">
                  <span>Quantity: {item.quantity}</span>
                  <span>Unit price: {formatCurrency(item.unitPrice)}</span>
                </span>
              </div>
              <div className="checkout-summary-line-total">
                <span>Item total</span>
                <strong>{formatCurrency(item.lineTotal)}</strong>
              </div>
            </div>
          ))
        ) : (
          <p className="muted">No selected items.</p>
        )}
      </div>

      <div className="checkout-summary-totals">
        <p>
          <span>Subtotal</span>
          <strong>{formatCurrency(preview.subtotal)}</strong>
        </p>
        <p>
          <span>Shipping fee</span>
          <strong>{hasShippingFee ? formatCurrency(preview.shippingFee) : 'Calculated after address'}</strong>
        </p>
        {hasGiftWrapFee && (
          <p>
            <span>Gift wrap fee</span>
            <strong>{formatCurrency(giftWrapFee)}</strong>
          </p>
        )}
        <p className="summary-total">
          <span>Total</span>
          <strong>{hasShippingFee ? formatCurrency(displayTotal) : 'Pending address'}</strong>
        </p>
      </div>

      {hasGiftWrapFee && !giftFeeSupported && (
        <p className="gift-fee-warning">
          Gift wrap fee is pending final confirmation at payment.
        </p>
      )}

      <div className="payment-method-card">
        <span>Payment method</span>
        <strong>VNPAY</strong>
      </div>

      <Button onClick={onPay} disabled={!canPay || loading || !preview.items.length}>
        Proceed to payment
      </Button>
      {disabledReason && !canPay && <p className="form-hint">{disabledReason}</p>}
    </aside>
  );
}
