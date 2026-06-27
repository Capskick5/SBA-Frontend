import { apiClient } from './apiClient';

export const aiChatService = {
  async recommend(query, topK = 5) {
    return apiClient.post('/ai/recommend', { query, topK });
  }
};
