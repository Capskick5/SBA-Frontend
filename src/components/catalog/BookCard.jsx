import { Link } from 'react-router-dom';
import AddToCartButton from './AddToCartButton';
import { formatCurrency } from '../../utils/formatters';
import { hasSalePrice, deriveDiscountPercent } from '../../utils/pricing';
import { Star } from 'lucide-react';

export default function BookCard({ book }) {
  // Use real backend discount attributes if present, otherwise no discount
  const isDiscounted = hasSalePrice(book);
  const discountRate = isDiscounted ? deriveDiscountPercent(book.originalPrice, book.price) : 0;
  const originalPrice = isDiscounted ? book.originalPrice : book.price;
  
  // Deterministic mock tags for visual flair
  const isNew = book.id % 4 === 0;
  const soldCount = (book.id * 17) % 80 + 5;

  return (
    <article className="book-card">
      <div className="book-card-cover-frame">
        <Link className="book-card-cover" to={`/books/${book.id}`}>
          <img src={book.coverUrl} alt={book.title} loading="lazy" />
        </Link>
        
        {/* Floating tags */}
        <div className="book-card-tags">
          {isNew && <span className="book-tag is-new">New</span>}
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
          <div className="book-card-rating">
            <Star size={13} fill="#ffc107" stroke="#ffc107" />
            <span>{book.ratingAvg ? book.ratingAvg.toFixed(1) : '4.5'}</span>
          </div>
          <span className="book-card-divider">•</span>
          <span className="book-card-sold">{soldCount} sold</span>
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
