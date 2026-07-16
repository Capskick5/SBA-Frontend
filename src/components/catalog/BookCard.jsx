import { Link } from 'react-router-dom';
import AddToCartButton from './AddToCartButton';
import StarRating from '../ui/StarRating';
import { formatCurrency } from '../../utils/formatters';
import { hasSalePrice, deriveDiscountPercent } from '../../utils/pricing';

export default function BookCard({ book }) {
  // Use real backend discount attributes if present, otherwise no discount
  const isDiscounted = hasSalePrice(book);
  const discountRate = isDiscounted ? deriveDiscountPercent(book.originalPrice, book.price) : 0;
  const originalPrice = isDiscounted ? book.originalPrice : book.price;
  const hasReviews = book.reviewCount > 0;
  const hasSales = book.soldCount > 0;

  return (
    <article className="book-card">
      <div className="book-card-cover-frame">
        <Link className="book-card-cover" to={`/books/${book.id}`}>
          <img src={book.coverUrl} alt={book.title} loading="lazy" />
        </Link>
        
        {/* Floating tags */}
        <div className="book-card-tags">
          {isDiscounted && <span className="book-tag is-discount">-{discountRate}%</span>}
        </div>

        {book.stock > 0 && (
          <AddToCartButton
            book={book}
            redirectTo="/"
            className="book-card-cart-action"
          />
        )}
      </div>

      <div className="book-card-info">
        <h3 className="book-card-title">
          <Link to={`/books/${book.id}`} title={book.title}>
            {book.title}
          </Link>
        </h3>
        <p className="book-card-author">{book.author || 'TBD'}</p>

        {/* Rating and Sold stats */}
        <div className="book-card-meta">
          {hasReviews ? (
            <div className="book-card-rating" title={`${book.reviewCount} customer reviews`}>
              <StarRating value={book.ratingAvg} size={13} />
              <span>{book.ratingAvg.toFixed(1)} ({book.reviewCount})</span>
            </div>
          ) : (
            <span className="book-card-no-rating">No ratings</span>
          )}
          {hasSales && (
            <>
              <span className="book-card-divider">•</span>
              <span className="book-card-sold">{book.soldCount} sold</span>
            </>
          )}
        </div>

        {/* Pricing block */}
        <div className="book-card-pricing">
          <div className="book-card-price-group">
            <span className="book-card-price-current">
              {formatCurrency(book.price)}
            </span>
            {isDiscounted && (
              <span className="book-card-price-original">
                {formatCurrency(originalPrice)}
              </span>
            )}
          </div>
        </div>

        {book.stock <= 0 && (
          <div className="book-card-out-of-stock">
            <span className="stock-badge is-empty">Out of stock</span>
          </div>
        )}
      </div>
    </article>
  );
}
