import { Link } from 'react-router-dom';
import AddToCartButton from './AddToCartButton';
import { formatCurrency } from '../../utils/formatters';

export default function BookCard({ book }) {
  return (
    <article className="book-card">
      <div className="book-card-cover-frame">
        <Link className="book-card-cover" to={`/books/${book.id}`}>
          <img src={book.coverUrl} alt={book.title} />
        </Link>
        {book.stock > 0 && (
          <AddToCartButton
            book={book}
            redirectTo="/"
            className="book-card-cart-action"
          />
        )}
      </div>
      <div>
        <h3 className="book-card-title"><Link to={`/books/${book.id}`}>{book.title}</Link></h3>
        <p className="book-card-author">{book.author}</p>
        <strong className="book-card-price">{formatCurrency(book.price)}</strong>
        {book.stock <= 0 && <p className="stock-badge is-empty">Out of stock</p>}
      </div>
    </article>
  );
}
