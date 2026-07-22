import { apiClient } from '../api/apiClient';

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
  // Public: vouchers currently available to claim
  async getAvailablePage({ page = 0, size = 12 } = {}) {
    const payload = await apiClient.get(`/vouchers?page=${page}&size=${size}&sort=createdAt,desc`);
    return normalizeVoucherPage(payload, page);
  },

  // Customer: claim a voucher into the personal wallet
  claim(voucherId) {
    return apiClient.post(`/vouchers/claim/${voucherId}`);
  },

  // Customer: vouchers already claimed by the current user
  async getMinePage({ page = 0, size = 20 } = {}) {
    const payload = await apiClient.get(`/vouchers/me?page=${page}&size=${size}&sort=claimedAt,desc`);
    return normalizeVoucherPage(payload, page);
  },

  async listMine({ page = 0, size = 20 } = {}) {
    const result = await this.getMinePage({ page, size });
    return result.items;
  },
};
