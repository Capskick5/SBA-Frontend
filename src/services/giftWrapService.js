import { apiClient } from '../api/apiClient';

export const giftWrapService = {
  list() {
    return apiClient.get('/gift-wraps', { auth: false });
  },
};
