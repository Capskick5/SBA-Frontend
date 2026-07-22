import { useState } from 'react';
import { Star } from 'lucide-react';
import { reviewService } from '../../services/reviewService';
import { translateErrorMessage } from '../../api/apiError';
import { showToast } from '../../utils/toast';
import Button from '../ui/Button';
import Textarea from '../ui/Textarea';

export default function ReviewForm({ bookId, onSubmitted }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError('');
    try {
      const review = await reviewService.createReview({ bookId, rating, comment });
      setComment('');
      setRating(5);
      onSubmitted?.(review);
      showToast('Đánh giá của bạn đã được đăng.', 'success');
    } catch (err) {
      setError(translateErrorMessage(err?.message) || 'Không thể gửi đánh giá. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="review-form" onSubmit={handleSubmit}>
      <div>
        <span className="review-form-label">Đánh giá của bạn</span>
        <div className="review-rating-input" role="radiogroup" aria-label="Đánh giá sách">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value} sao`}
              onClick={() => setRating(value)}
            >
              <Star size={28} fill={value <= rating ? '#f5a623' : 'transparent'} />
            </button>
          ))}
          <strong>{rating}/5</strong>
        </div>
      </div>

      <Textarea
        label="Nhận xét"
        value={comment}
        maxLength={1000}
        placeholder="Chia sẻ cảm nhận của bạn về cuốn sách này..."
        onChange={(event) => setComment(event.target.value)}
      />
      <div className="review-form-footer">
        <span>{comment.length}/1000</span>
        <Button type="submit" loading={submitting} disabled={submitting}>
          Đăng đánh giá
        </Button>
      </div>
      <p className="review-form-policy">
        Bạn chỉ có thể đánh giá sách sau khi đã nhận được hàng (đơn hàng đã giao thành công).
      </p>
      {error && <p className="review-form-error" role="alert">{error}</p>}
    </form>
  );
}
