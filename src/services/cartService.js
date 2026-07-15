import { apiClient } from './apiClient';
import { tokenStorage } from './tokenStorage';
import { bookService } from './bookService';

const fallbackCover = (title) => `https://placehold.co/120x170?text=${encodeURIComponent(title || 'Book')}`;

function mapCartItem(item) {
  const title = item.bookTitle || 'Untitled book';
  return {
    itemId: item.id,
    bookId: item.bookId,
    title,
    coverUrl: item.bookCoverUrl || fallbackCover(title),
    price: item.bookPrice || 0,
    quantity: item.quantity || 1,
    lineTotal: item.lineTotal || 0,
    available: item.available,
  };
}

function mapCart(cart) {
  return {
    id: cart?.id,
    items: (cart?.items || []).map(mapCartItem),
    subtotal: cart?.subtotal || 0,
  };
}

const GUEST_CART_KEY = 'bookverse_guest_cart';

function getLocalCart() {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return { items: [], subtotal: 0 };
    return JSON.parse(raw);
  } catch (err) {
    return { items: [], subtotal: 0 };
  }
}

function saveLocalCart(cart) {
  const subtotal = cart.items.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
  const updatedCart = { ...cart, subtotal };
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(updatedCart));
  return updatedCart;
}

export const cartService = {
  async getCart() {
    if (!tokenStorage.getAccessToken()) {
      return mapCart(getLocalCart());
    }
    return mapCart(await apiClient.get('/cart'));
  },

  async addItem(book, quantity = 1) {
    if (!tokenStorage.getAccessToken()) {
      let fullBook = book;
      if (!book.title || book.price === undefined) {
        try {
          fullBook = await bookService.getBookById(book.id);
        } catch (e) {
          console.error('Failed to fetch book detail for guest cart', e);
        }
      }
      const cart = getLocalCart();
      const existingItem = cart.items.find((item) => item.bookId === fullBook.id);
      if (existingItem) {
        existingItem.quantity += quantity;
        existingItem.lineTotal = existingItem.quantity * existingItem.bookPrice;
      } else {
        const newItem = {
          id: `guest_item_${Date.now()}_${fullBook.id}`,
          bookId: fullBook.id,
          bookTitle: fullBook.title,
          bookCoverUrl: fullBook.coverUrl,
          bookPrice: fullBook.price,
          quantity: quantity,
          lineTotal: quantity * (fullBook.price || 0),
          available: true,
        };
        cart.items.push(newItem);
      }
      return mapCart(saveLocalCart(cart));
    }

    return mapCart(await apiClient.post('/cart/items', {
      bookId: book.id,
      quantity,
    }));
  },

  async updateQuantity(itemId, bookId, quantity) {
    if (!tokenStorage.getAccessToken()) {
      const cart = getLocalCart();
      const item = cart.items.find((i) => i.id === itemId || i.bookId === bookId);
      if (item) {
        item.quantity = Math.max(1, quantity);
        item.lineTotal = item.quantity * item.bookPrice;
      }
      return mapCart(saveLocalCart(cart));
    }

    return mapCart(await apiClient.put(`/cart/items/${itemId}`, {
      bookId: bookId,
      quantity: Math.max(1, quantity),
    }));
  },

  async removeItem(itemId) {
    if (!tokenStorage.getAccessToken()) {
      const cart = getLocalCart();
      cart.items = cart.items.filter((i) => i.id !== itemId);
      return mapCart(saveLocalCart(cart));
    }

    return mapCart(await apiClient.delete(`/cart/items/${itemId}`));
  },
};
