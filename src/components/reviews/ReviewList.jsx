import { EmptyState } from '../ui/State';

export default function ReviewList({ reviews }) {
  if (!reviews.length) return <EmptyState text="Chua co review." />;
  return (
    <div className="stack">
      {reviews.map((review) => (
        <article className="panel" key={review.id}>
          <strong>{review.userName}</strong>
          <p>Rating: {review.rating}/5</p>
          <p>{review.comment}</p>
        </article>
      ))}
    </div>
  );
}
