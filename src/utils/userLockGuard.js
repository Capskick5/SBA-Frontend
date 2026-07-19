import { orderService } from '../services/orderService';

export const USER_LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export function getLockExpiration(userId) {
  if (!userId) return null;
  const expiredAtStr = localStorage.getItem(`locked_until_${userId}`);
  if (!expiredAtStr) return null;
  const expiredAt = Number(expiredAtStr);
  if (isNaN(expiredAt)) return null;
  if (Date.now() > expiredAt) {
    localStorage.removeItem(`locked_until_${userId}`);
    return null;
  }
  return expiredAt;
}

export function isUserLocked(userId) {
  return getLockExpiration(userId) !== null;
}

export function getLockedTimeRemainingMessage(userId) {
  const expiration = getLockExpiration(userId);
  if (!expiration) return '';
  const diffMs = expiration - Date.now();
  if (diffMs <= 0) return '';
  const minutes = Math.ceil(diffMs / (60 * 1000));
  return `Tài khoản của bạn tạm thời bị khóa trong ${minutes} phút do hủy liên tục 5 đơn hàng.`;
}

export function setLocalUserLock(userId, expiresAt) {
  if (userId) {
    localStorage.setItem(`locked_until_${userId}`, String(expiresAt));
  }
}

export function clearLocalUserLock(userId) {
  if (userId) {
    localStorage.removeItem(`locked_until_${userId}`);
  }
}

/**
 * Checks the user's order history. If the last 5 orders are all CANCELLED,
 * and the latest cancellation was within 15 minutes, set the lock locally and return the lock expiration time.
 * Returns null if not locked.
 */
export async function checkServerOrderHistoryAndLock(userId) {
  if (!userId) return null;
  try {
    const page = await orderService.getOrdersPage({ page: 0, size: 5 });
    const items = page.items || [];
    if (items.length === 5 && items.every(o => o.status === 'CANCELLED')) {
      const cancelledTimes = items
        .map(o => o.cancelledAt ? new Date(o.cancelledAt).getTime() : 0)
        .filter(t => t > 0);
      if (cancelledTimes.length === 5) {
        const latestCancellation = Math.max(...cancelledTimes);
        const expiresAt = latestCancellation + USER_LOCK_DURATION_MS;
        if (Date.now() < expiresAt) {
          setLocalUserLock(userId, expiresAt);
          return expiresAt;
        }
      }
    }
    clearLocalUserLock(userId);
    return null;
  } catch (err) {
    console.error('Failed to check order history lock status:', err);
    return null;
  }
}
