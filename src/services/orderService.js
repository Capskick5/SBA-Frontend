import { apiClient } from './apiClient';

export const orderService = {
  async getOrders() {
    const page = await apiClient.get('/orders?page=0&size=100');
    return page?.items || [];
  },

  getOrderById(id) {
    return apiClient.get(`/orders/${id}`);
  },
};
