export default function OrderStatusBadge({ status, size = 'small' }) {
  const statusClasses = {
    PENDING: 'pending-payment',
    PENDING_PAYMENT: 'pending-payment',
    PAID: 'paid',
    PROCESSING: 'processing',
    PACKED: 'packed',
    SHIPPED: 'shipping',
    RE_DELIVERY: 're-delivery',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
    PAYMENT_FAILED: 'payment-failed',
    REFUND_REQUESTED: 'refund-requested',
    REFUNDED: 'refunded',
  };

  const statusClass = statusClasses[status] || 'unknown';
  const label = status ? status.replaceAll('_', ' ') : 'UNKNOWN';

  return (
    <span className={`status-badge ${statusClass} ${size === 'large' ? 'status-badge-large' : ''}`}>
      {label}
    </span>
  );
}
