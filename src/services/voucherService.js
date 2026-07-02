import { apiClient } from './apiClient';

function unwrapVoucherPage(response) {
  const page = response?.data || response;
  return Array.isArray(page?.items) ? page.items : [];
}

export const voucherService = {
  async listMine({ page = 0, size = 20 } = {}) {
    const payload = await apiClient.get(`/vouchers/me?page=${page}&size=${size}`);
    return unwrapVoucherPage(payload);
  },
};
