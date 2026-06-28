import { EmptyState } from '../ui/State';

export default function ReviewList({ reviews }) {
  if (!reviews.length) return <EmptyState text="No reviews yet." />;
  return (
    <div className="review-list">
      {reviews.map((review) => (
        <article className="review-card" key={review.id}>
          <strong>{review.userName}</strong>
          <p className="review-stars" aria-label={`${review.rating} out of 5 stars`}>
            {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
          </p>
          <p>{review.comment}</p>
        </article>
      ))}
    </div>
  );
}
