import { formatCurrency } from '../../utils/formatters';
import { hasSalePrice } from '../../utils/pricing';

export default function BookPrice({ book, className = '' }) {
  const onSale = hasSalePrice(book);

  if (!onSale) {
    return <strong className={`book-card-price ${className}`.trim()}>{formatCurrency(book.price)}</strong>;
  }

  return (
    <div className={`book-price-group ${className}`.trim()}>
      <span className="book-price-original">{formatCurrency(book.originalPrice)}</span>
      <strong className="book-card-price">{formatCurrency(book.price)}</strong>
    </div>
  );
}
