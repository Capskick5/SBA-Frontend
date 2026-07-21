import Button from '../ui/Button';
import { formatCurrency } from '../../utils/formatters';

const PAYMENT_METHODS = [
  { value: 'VNPAY', label: 'VNPAY', hint: 'Pay online now' },
  { value: 'COD', label: 'Cash on delivery', hint: 'Pay when your order arrives' },
];

export default function CheckoutSummary({
  preview,
  onPay,
  canPay = false,
  disabledReason = '',
  loading = false,
  paymentMethod = 'VNPAY',
  onChangePaymentMethod,
}) {
  const hasShippingFee = typeof preview.shippingFee === 'number';
  const giftWrapFee = Number(preview.giftWrapFee || 0);
  const hasGiftWrapFee = giftWrapFee > 0;
  const hasDiscount = Number(preview.discountAmount || 0) > 0;

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
        {hasDiscount && (
          <p className="summary-discount-row">
            <span>Voucher discount</span>
            <strong>-{formatCurrency(preview.discountAmount)}</strong>
          </p>
        )}
        {hasGiftWrapFee && (
          <p>
            <span>Gift wrap fee</span>
            <strong>{formatCurrency(giftWrapFee)}</strong>
          </p>
        )}
        <p className="summary-total">
          <span>Total</span>
          <strong>{hasShippingFee ? formatCurrency(preview.total) : 'Pending address'}</strong>
        </p>
      </div>

      <div className="payment-method-select" role="group" aria-label="Payment method">
        <span className="payment-method-select-label">Payment method</span>
        <div className="payment-method-options">
          {PAYMENT_METHODS.map((method) => (
            <button
              type="button"
              key={method.value}
              className={paymentMethod === method.value ? 'is-active' : ''}
              onClick={() => onChangePaymentMethod?.(method.value)}
              disabled={loading}
            >
              <strong>{method.label}</strong>
              <span>{method.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <Button onClick={onPay} disabled={!canPay || loading || !preview.items.length}>
        Proceed to payment
      </Button>
      {disabledReason && !canPay && <p className="form-hint">{disabledReason}</p>}
    </aside>
  );
}
