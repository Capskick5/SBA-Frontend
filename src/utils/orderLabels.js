/** Shared Vietnamese labels for order status and payment method. */

export const ORDER_STATUS_LABELS = {
  PENDING: "Chờ thanh toán",
  PENDING_PAYMENT: "Chờ thanh toán",
  PAID: "Đã thanh toán",
  PROCESSING: "Đang xử lý",
  PACKED: "Đã đóng gói",
  SHIPPED: "Đã gửi hàng",
  RE_DELIVERY: "Giao lại",
  DELIVERED: "Đã giao",
  CANCELLED: "Đã hủy",
  PAYMENT_FAILED: "Thanh toán thất bại",
  REFUND_REQUESTED: "Yêu cầu hoàn tiền",
  REFUNDED: "Đã hoàn tiền",
};

export const ORDER_STATUS_CLASS = {
  PENDING_PAYMENT: 'warning',
  PAID: 'success',
  PROCESSING: 'info',
  PACKED: 'info',
  SHIPPED: 'info',
  RE_DELIVERY: 'info',
  DELIVERED: 'success',
  CANCELLED: 'error',
  PAYMENT_FAILED: 'error',
  REFUND_REQUESTED: 'warning',
  REFUNDED: 'success',
};

export const ORDER_STATUS_LIST_CLASS = {
  PENDING_PAYMENT: 'pending-payment',
  PAID: 'paid',
  PROCESSING: 'processing',
  PACKED: 'processing',
  SHIPPED: 'shipped',
  RE_DELIVERY: 'shipping',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  PAYMENT_FAILED: 'payment-failed',
  REFUND_REQUESTED: 'refund-requested',
  REFUNDED: 'refunded',
};

export function getOrderStatusLabel(status) {
  return ORDER_STATUS_LABELS[status] || String(status || '').replace(/_/g, ' ');
}

export function getOrderStatusConfig(status, { listStyle = false } = {}) {
  const text = getOrderStatusLabel(status);
  const classMap = listStyle ? ORDER_STATUS_LIST_CLASS : ORDER_STATUS_CLASS;
  return {
    text,
    class: classMap[status] || (listStyle ? 'unknown' : 'info'),
  };
}

export function getPaymentMethodLabel(paymentMethod) {
  if (paymentMethod === 'COD') return "Thanh toán khi nhận hàng";
  return "Thanh toán qua VNPay";
}
