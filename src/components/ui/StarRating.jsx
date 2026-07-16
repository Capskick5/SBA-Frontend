import { Star } from 'lucide-react';

export default function StarRating({
  value = 0,
  max = 5,
  size = 16,
  className = '',
  filledColor = '#ffc107',
  emptyStroke = '#d1d5db',
}) {
  const rating = Math.min(max, Math.max(0, Number(value) || 0));

  return (
    <div
      className={`star-rating ${className}`.trim()}
      role="img"
      aria-label={`${rating.toFixed(1)} out of ${max} stars`}
    >
      {Array.from({ length: max }).map((_, index) => {
        const fillPercent = Math.min(1, Math.max(0, rating - index)) * 100;

        return (
          <span
            key={index}
            className="star-rating-item"
            style={{ width: size, height: size }}
          >
            <Star
              className="star-rating-bg"
              size={size}
              fill="transparent"
              stroke={emptyStroke}
              aria-hidden="true"
            />
            <span
              className="star-rating-fill"
              style={{ width: `${fillPercent}%` }}
              aria-hidden="true"
            >
              <Star size={size} fill={filledColor} stroke={filledColor} />
            </span>
          </span>
        );
      })}
    </div>
  );
}
