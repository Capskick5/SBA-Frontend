const REVIEWS_SEEN_KEY = 'admin_reviews_last_seen_at';
export const ADMIN_REVIEWS_SEEN_EVENT = 'admin_reviews_seen';

export function getReviewsLastSeenAt() {
  return localStorage.getItem(REVIEWS_SEEN_KEY) || '1970-01-01T00:00:00.000Z';
}

export function markReviewsAsSeen() {
  localStorage.setItem(REVIEWS_SEEN_KEY, new Date().toISOString());
  window.dispatchEvent(new Event(ADMIN_REVIEWS_SEEN_EVENT));
}

export function countNewReviews(reviews, lastSeenAt = getReviewsLastSeenAt()) {
  const seenTime = new Date(lastSeenAt).getTime();
  if (Number.isNaN(seenTime)) return 0;
  return (reviews || []).filter((review) => {
    if (!review?.createdAt) return false;
    return new Date(review.createdAt).getTime() > seenTime;
  }).length;
}
