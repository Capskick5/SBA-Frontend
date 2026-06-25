import { mockReviews } from '../mocks/mockData';

export const reviewService = {
  getReviewsByBookId(bookId) {
    return Promise.resolve(mockReviews.filter((review) => String(review.bookId) === String(bookId)));
  },
};
