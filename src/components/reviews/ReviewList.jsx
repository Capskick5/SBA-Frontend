import { EmptyState } from '../ui/State';
import { formatDate } from '../../utils/formatters';

export default function ReviewList({ reviews }) {
  if (!reviews.length) return <EmptyState text="Chưa có đánh giá." />;
  return (
    <div className="review-list">
      {reviews.map((review) => (
        <article className="review-card" key={review.id}>
          <div className="review-card-header">
            <div>
              <strong>{review.userName || 'Khách hàng BookVerse'}</strong>
              <span>Đã mua hàng</span>
            </div>
            <time dateTime={review.createdAt}>{formatDate(review.createdAt)}</time>
          </div>
          <div className="review-stars" aria-label={`${review.rating} trên 5 sao`}>
            {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
            <strong>{review.rating}/5</strong>
          </div>
          <p>{review.comment || 'Khách hàng chỉ chấm điểm, không viết nhận xét.'}</p>
        </article>
      ))}
    </div>
  );
}
