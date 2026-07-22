export function formatPaymentTimeLeft(expiresAt, now = Date.now()) {
  if (!expiresAt) return 'Không có hạn thanh toán';

  const remainingSeconds = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 1000));
  if (remainingSeconds === 0) return 'Hết hạn thanh toán';

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  return `Thanh toán hết hạn sau ${minutes}:${String(seconds).padStart(2, '0')}`;
}
