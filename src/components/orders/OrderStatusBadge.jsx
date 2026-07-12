export default function OrderStatusBadge({ status, size = 'small' }) {
  const statusClasses = {
    PENDING: 'pending-payment',
    PENDING_PAYMENT: 'pending-payment',
    PAID: 'paid',
    PROCESSING: 'processing',
    SHIPPED: 'shipping',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
  };

  const statusClass = statusClasses[status] || 'unknown';
  const label = status ? status.replaceAll('_', ' ') : 'UNKNOWN';

  return (
    <span className={`status-badge ${statusClass} ${size === 'large' ? 'status-badge-large' : ''}`}>
      {label}
    </span>
  );
}
