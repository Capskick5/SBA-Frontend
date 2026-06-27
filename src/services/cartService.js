import { apiClient } from './apiClient';

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

export const cartService = {
  async getCart() {
    return mapCart(await apiClient.get('/cart'));
  },

  async addItem(book, quantity = 1) {
    return mapCart(await apiClient.post('/cart/items', {
      bookId: book.id,
      quantity,
    }));
  },

  async updateQuantity(itemId, quantity) {
    return mapCart(await apiClient.put(`/cart/items/${itemId}`, {
      quantity: Math.max(1, quantity),
    }));
  },

  async removeItem(itemId) {
    return mapCart(await apiClient.delete(`/cart/items/${itemId}`));
  },
};
