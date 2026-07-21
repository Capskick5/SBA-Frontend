import { apiClient } from '../api/apiClient';

export const bannerService = {
  list() {
    return apiClient.get('/banners');
  },
};
