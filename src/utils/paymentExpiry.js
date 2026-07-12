export function formatPaymentTimeLeft(expiresAt, now = Date.now()) {
  if (!expiresAt) return 'Payment expiry unavailable';

  const remainingSeconds = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 1000));
  if (remainingSeconds === 0) return 'Payment window expired';

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  return `Payment expires in ${minutes}:${String(seconds).padStart(2, '0')}`;
}
