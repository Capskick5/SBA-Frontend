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

  async claimByCode(code) {
    const cleanCode = String(code || '').trim().toUpperCase();
    if (!cleanCode) {
      throw new Error('Vui lòng nhập mã giảm giá.');
    }
    const available = await this.getAvailablePage({ page: 0, size: 50 }).catch(() => ({ items: [] }));
    const match = (available.items || []).find((v) => String(v.code || '').toUpperCase() === cleanCode);
    if (!match) {
      throw new Error(`Mã giảm giá "${cleanCode}" không hợp lệ hoặc đã hết hạn.`);
    }
    return this.claim(match.id);
  },
};

