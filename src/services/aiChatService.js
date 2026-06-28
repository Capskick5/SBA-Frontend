import { apiClient } from './apiClient';

export const aiChatService = {
  async recommend(query, history = [], topK = 5) {
    return apiClient.post('/ai/recommend', { query, history, topK });
  }
};
