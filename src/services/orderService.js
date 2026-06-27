import { apiClient } from './apiClient';

export const orderService = {
  getOrders: () => apiClient.get('/orders'),
  getOrderById: (id) => apiClient.get(`/orders/${id}`),
};