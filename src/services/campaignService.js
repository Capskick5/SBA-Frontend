import { apiClient } from '../api/apiClient';

export const campaignService = {
  async getActiveCampaigns({ page = 0, size = 20 } = {}) {
    try {
      const payload = await apiClient.get(`/campaigns?page=${page}&size=${size}`);
      const pageData = payload?.data || payload;
      return Array.isArray(pageData?.items) ? pageData.items : [];
    } catch {
      return [];
    }
  },
};
