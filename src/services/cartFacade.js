import { authService } from './authService';
import { cartService } from './cartService';
import { guestCartService } from './guestCartService';
import { clearGuestCart, getGuestCartItems } from './guestCartStorage';
import { apiClient } from './apiClient';
import { createError } from './apiError';
import {
  getPendingPaymentOrder,
  PENDING_PAYMENT_MESSAGE,
} from '../utils/pendingOrderGuard';

function isLoggedInCustomer() {
  const user = authService.getCurrentUser();
  return Boolean(user && user.role !== 'ADMIN');
}

function activeCartService() {
  return isLoggedInCustomer() ? cartService : guestCartService;
}

function mapServerCart(cart) {
  return {
    id: cart?.id,
    items: (cart?.items || []).map((item) => ({
      itemId: item.id ?? item.itemId,
      bookId: item.bookId,
      title: item.bookTitle || item.title || 'Untitled book',
      coverUrl: item.bookCoverUrl || item.coverUrl,
      price: item.bookPrice ?? item.price ?? 0,
      quantity: item.quantity || 1,
      lineTotal: item.lineTotal || 0,
      available: item.available,
    })),
    subtotal: cart?.subtotal || 0,
  };
}

export const cartFacade = {
  isGuest() {
    return !isLoggedInCustomer();
  },

  getCart() {
    return activeCartService().getCart();
  },

  async addItem(book, quantity = 1) {
    if (isLoggedInCustomer()) {
      const pendingOrder = await getPendingPaymentOrder();
      if (pendingOrder) {
        throw createError({
          code: 400,
          error_type: 'VALIDATION_ERROR',
          message: PENDING_PAYMENT_MESSAGE,
        });
      }
    }
    return activeCartService().addItem(book, quantity);
  },

  updateQuantity(itemId, bookId, quantity) {
    return activeCartService().updateQuantity(itemId, bookId, quantity);
  },

  removeItem(itemId) {
    return activeCartService().removeItem(itemId);
  },

  /** Push all guest lines atomically, then clear local storage only after success. */
  async mergeGuestCartAfterLogin() {
    const guestItems = getGuestCartItems();
    if (!guestItems.length || !isLoggedInCustomer()) return null;

    const merged = await apiClient.post('/cart/merge', {
      items: guestItems.map(({ bookId, quantity }) => ({ bookId, quantity })),
    });
    clearGuestCart();
    return merged ? mapServerCart(merged) : cartService.getCart();
  },
};
