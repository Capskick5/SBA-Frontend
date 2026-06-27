import { apiClient } from './apiClient';

export const cartService = {
  getCart: () => apiClient.get('/cart'),
  updateQuantity: (itemId, quantity) => apiClient.put(`/cart/items/${itemId}`, { quantity }),
  removeItem: (itemId) => apiClient.delete(`/cart/items/${itemId}`),
};