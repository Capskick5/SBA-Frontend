import { authService } from '../services/authService';
import { orderService } from '../services/orderService';

export const PENDING_PAYMENT_MESSAGE =
  'You have a pending payment order. Please complete or cancel it before continuing to shop.';

const CACHE_TTL_MS = 45_000;

let cache = {
  at: 0,
  order: undefined,
};

function isLoggedInCustomer() {
  const user = authService.getCurrentUser();
  return Boolean(user && user.role !== 'ADMIN');
}

function readErrorMessage(error) {
  return String(error?.response?.data?.message || error?.message || '');
}

export function clearPendingPaymentCache() {
  cache = { at: 0, order: undefined };
}

export function isPendingPaymentBlockedError(error) {
  const message = readErrorMessage(error);
  return /pending payment/i.test(message);
}

export function getPendingPaymentUserMessage(error) {
  if (isPendingPaymentBlockedError(error)) {
    return PENDING_PAYMENT_MESSAGE;
  }
  return null;
}

/**
 * Returns the first PENDING_PAYMENT order for the logged-in customer, or null.
 * Guests/admins skip the check (matches backend enforcement).
 */
export async function getPendingPaymentOrder({ force = false } = {}) {
  if (!isLoggedInCustomer()) {
    return null;
  }

  const now = Date.now();
  if (!force && cache.order !== undefined && now - cache.at < CACHE_TTL_MS) {
    return cache.order;
  }

  try {
    const page = await orderService.getOrdersPage({
      page: 0,
      size: 1,
      status: 'PENDING_PAYMENT',
    });
    const order = page.items?.[0] || null;
    cache = { at: now, order };
    return order;
  } catch {
    // Fail open on list errors so shopping is not hard-blocked by a transient API issue;
    // backend still rejects add/checkout if a pending order exists.
    return null;
  }
}
