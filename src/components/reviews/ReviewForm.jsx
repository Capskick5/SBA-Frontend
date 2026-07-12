import { useState } from 'react';
import { Star } from 'lucide-react';
import { reviewService } from '../../services/reviewService';
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
      showToast('Your review has been published.', 'success');
    } catch (err) {
      setError(err?.message || 'Could not submit your review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="review-form" onSubmit={handleSubmit}>
      <div>
        <span className="review-form-label">Your rating</span>
        <div className="review-rating-input" role="radiogroup" aria-label="Book rating">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value} ${value === 1 ? 'star' : 'stars'}`}
              onClick={() => setRating(value)}
            >
              <Star size={28} fill={value <= rating ? '#f5a623' : 'transparent'} />
            </button>
          ))}
          <strong>{rating}/5</strong>
        </div>
      </div>

      <Textarea
        label="Your review"
        value={comment}
        maxLength={1000}
        placeholder="Share what you liked about this book..."
        onChange={(event) => setComment(event.target.value)}
      />
      <div className="review-form-footer">
        <span>{comment.length}/1000</span>
        <Button type="submit" loading={submitting} disabled={submitting}>
          Publish review
        </Button>
      </div>
      <p className="review-form-policy">Only books from delivered orders can be reviewed.</p>
      {error && <p className="review-form-error" role="alert">{error}</p>}
    </form>
  );
}
