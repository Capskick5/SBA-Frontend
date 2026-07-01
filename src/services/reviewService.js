import { apiClient } from './apiClient';

export const reviewService = {
  async getReviewsByBookId(bookId) {
    const page = await apiClient.get(`/books/${bookId}/reviews`);
    return page?.items || page?.content || [];
  },
};
