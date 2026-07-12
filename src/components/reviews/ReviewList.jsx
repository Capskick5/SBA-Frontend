import { EmptyState } from '../ui/State';
import { formatDate } from '../../utils/formatters';

export default function ReviewList({ reviews }) {
  if (!reviews.length) return <EmptyState text="No reviews yet." />;
  return (
    <div className="review-list">
      {reviews.map((review) => (
        <article className="review-card" key={review.id}>
          <div className="review-card-header">
            <div>
              <strong>{review.userName || 'BookVerse customer'}</strong>
              <span>Verified purchase</span>
            </div>
            <time dateTime={review.createdAt}>{formatDate(review.createdAt)}</time>
          </div>
          <div className="review-stars" aria-label={`${review.rating} out of 5 stars`}>
            {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
            <strong>{review.rating}/5</strong>
          </div>
          <p>{review.comment || 'The customer submitted a rating without a written comment.'}</p>
        </article>
      ))}
    </div>
  );
}
