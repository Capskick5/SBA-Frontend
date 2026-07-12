import { apiClient } from './apiClient';

export const reviewService = {
  async getReviewsByBookId(bookId, { page = 0, size = 5 } = {}) {
    const params = new URLSearchParams({ page: String(page), size: String(size), sort: 'createdAt,desc' });
    const result = await apiClient.get(`/books/${bookId}/reviews?${params}`);
    return {
      items: result?.items || result?.content || [],
      totalItems: result?.totalItems ?? result?.totalElements ?? 0,
      totalPages: result?.totalPages ?? 0,
      page: result?.page ?? page,
    };
  },

  async getMyReviewForBook(bookId) {
    return apiClient.get(`/books/${bookId}/reviews/me`);
  },

  async createReview({ bookId, rating, comment }) {
    return apiClient.post('/reviews', {
      bookId: Number(bookId),
      rating: Number(rating),
      comment: comment.trim(),
    });
  },

  async deleteReview(reviewId) {
    return apiClient.delete(`/reviews/${reviewId}`);
  },
};
