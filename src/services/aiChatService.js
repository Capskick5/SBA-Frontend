import { apiClient } from './apiClient';

export const aiChatService = {
  async recommend(query, history = [], topK = 5) {
    return apiClient.post('/ai/recommend', { query, history, topK });
  },

  async getSessions(type) {
    return apiClient.get(`/ai/chat/sessions?type=${type}`);
  },

  async getSessionById(id) {
    return apiClient.get(`/ai/chat/sessions/${id}`);
  },

  async createSession(type, title, bookIds = []) {
    return apiClient.post('/ai/chat/sessions', { sessionType: type, title, bookIds });
  },

  async deleteSession(id) {
    return apiClient.delete(`/ai/chat/sessions/${id}`);
  },

  async sendMessage(sessionId, content) {
    return apiClient.post(`/ai/chat/sessions/${sessionId}/messages`, { content });
  }
};

