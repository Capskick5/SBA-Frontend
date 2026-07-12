import { apiClient } from './apiClient';

function normalizeVoucherPage(response, requestedPage) {
  const page = response?.data || response;
  return {
    items: Array.isArray(page?.items) ? page.items : [],
    page: page?.page ?? requestedPage,
    totalItems: page?.totalItems ?? 0,
    totalPages: page?.totalPages ?? 0,
  };
}

export const voucherService = {
  async getMinePage({ page = 0, size = 20 } = {}) {
    const payload = await apiClient.get(`/vouchers/me?page=${page}&size=${size}&sort=expiresAt,asc`);
    return normalizeVoucherPage(payload, page);
  },

  async listMine({ page = 0, size = 20 } = {}) {
    const result = await this.getMinePage({ page, size });
    return result.items;
  },
};
