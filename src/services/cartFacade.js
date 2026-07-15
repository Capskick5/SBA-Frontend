import { authService } from './authService';
import { cartService } from './cartService';
import { guestCartService } from './guestCartService';
import { clearGuestCart, getGuestCartItems } from './guestCartStorage';
import { apiClient } from './apiClient';

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

  addItem(book, quantity = 1) {
    return activeCartService().addItem(book, quantity);
  },

  updateQuantity(itemId, bookId, quantity) {
    return activeCartService().updateQuantity(itemId, bookId, quantity);
  },

  removeItem(itemId) {
    return activeCartService().removeItem(itemId);
  },

  /**
   * After login, push local guest lines into the server cart, then clear guest storage.
   * Falls back to sequential addItem when /cart/merge is unavailable.
   */
  async mergeGuestCartAfterLogin() {
    const guestItems = getGuestCartItems();
    if (!guestItems.length || !isLoggedInCustomer()) return null;

    try {
      try {
        const merged = await apiClient.post('/cart/merge', {
          items: guestItems.map(({ bookId, quantity }) => ({ bookId, quantity })),
        });
        clearGuestCart();
        return merged ? mapServerCart(merged) : cartService.getCart();
      } catch (err) {
        const missing = err?.code === 404 || err?.error_type === 'RESOURCE_NOT_FOUND';
        if (!missing) throw err;
      }

      for (const item of guestItems) {
        await cartService.addItem(
          {
            id: item.bookId,
            title: item.title,
            coverUrl: item.coverUrl,
            price: item.price,
            stock: item.available === false ? 0 : 1,
          },
          item.quantity || 1,
        );
      }
      clearGuestCart();
      return cartService.getCart();
    } catch (err) {
      console.error('Failed to merge guest cart:', err);
      return null;
    }
  },
};
