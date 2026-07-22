import Button from '../ui/Button';
import { formatCurrency } from '../../utils/formatters';

export default function CheckoutSummary({
  preview,
  onPay,
  canPay = false,
  disabledReason = '',
  loading = false,
}) {
  const hasShippingFee = typeof preview.shippingFee === 'number';
  const giftWrapFee = Number(preview.giftWrapFee || 0);
  const hasGiftWrapFee = giftWrapFee > 0;
  const hasDiscount = Number(preview.discountAmount || 0) > 0;

  return (
    <aside className="summary checkout-summary-card">
      <div>
        <span className="summary-kicker">Tóm tắt đơn hàng</span>
        <h3>Tóm tắt thanh toán</h3>
      </div>

      <div className="checkout-summary-items">
        {loading ? (
          <p className="muted">Đang tải sách đã chọn...</p>
        ) : preview.items.length > 0 ? (
          preview.items.map((item) => (
            <div className="checkout-summary-item" key={`${item.bookId}-${item.title}`}>
              <div>
                <strong>{item.title}</strong>
                <span className="checkout-summary-item-meta">
                  <span>Số lượng: {item.quantity}</span>
                  <span>Đơn giá: {formatCurrency(item.unitPrice)}</span>
                </span>
              </div>
              <div className="checkout-summary-line-total">
                <span>Thành tiền</span>
                <strong>{formatCurrency(item.lineTotal)}</strong>
              </div>
            </div>
          ))
        ) : (
          <p className="muted">Không có sản phẩm nào được chọn.</p>
        )}
      </div>

      <div className="checkout-summary-totals">
        <p>
          <span>Tạm tính</span>
          <strong>{formatCurrency(preview.subtotal)}</strong>
        </p>
        <p>
          <span>Phí vận chuyển</span>
          <strong>{hasShippingFee ? formatCurrency(preview.shippingFee) : 'Tính sau khi nhập địa chỉ'}</strong>
        </p>
        {hasDiscount && (
          <p className="summary-discount-row">
            <span>Giảm giá mã voucher</span>
            <strong>-{formatCurrency(preview.discountAmount)}</strong>
          </p>
        )}
        {hasGiftWrapFee && (
          <p>
            <span>Phí gói quà{preview.giftWrapName ? ` (${preview.giftWrapName})` : ''}</span>
            <strong>{formatCurrency(giftWrapFee)}</strong>
          </p>
        )}
        <p className="summary-total">
          <span>Tổng cộng</span>
          <strong>{hasShippingFee ? formatCurrency(preview.total) : 'Chờ địa chỉ'}</strong>
        </p>
      </div>

      <Button onClick={onPay} disabled={!canPay || loading || !preview.items.length}>
        Tiến hành thanh toán
      </Button>
      {disabledReason && !canPay && <p className="form-hint">{disabledReason}</p>}
    </aside>
  );
}
