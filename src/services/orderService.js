import { apiClient } from './apiClient';

export const orderService = {
  async getOrdersPage({ page = 0, size = 10, status, statuses } = {}) {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
      sort: 'createdAt,desc',
    });
    if (status) params.set('status', status);
    if (statuses?.length) params.set('statuses', statuses.join(','));
    const result = await apiClient.get(`/orders?${params}`);
    return {
      items: result?.items || result?.content || [],
      page: result?.page ?? page,
      totalItems: result?.totalItems ?? result?.totalElements ?? 0,
      totalPages: result?.totalPages ?? 0,
    };
  },

  async getOrders() {
    const page = await this.getOrdersPage({ page: 0, size: 100 });
    return page.items;
  },

  getOrderById(id) {
    return apiClient.get(`/orders/${id}`);
  },

  cancelPendingOrder(id) {
    return apiClient.post(`/orders/${id}/cancel`);
  },

  getPendingPaymentLink(id) {
    return apiClient.get(`/orders/${id}/payment-link`);
  },
};
