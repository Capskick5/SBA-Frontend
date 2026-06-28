import { Link } from 'react-router-dom';
import AddToCartButton from './AddToCartButton';
import { formatCurrency } from '../../utils/formatters';

export default function BookCard({ book }) {
  return (
    <article className="book-card">
      <Link className="book-card-cover" to={`/books/${book.id}`}><img src={book.coverUrl} alt={book.title} /></Link>
      <div>
        <h3 className="book-card-title"><Link to={`/books/${book.id}`}>{book.title}</Link></h3>
        <p className="book-card-author">{book.author}</p>
        <strong className="book-card-price">{formatCurrency(book.price)}</strong>
        <p className={`stock-badge ${book.stock > 0 ? 'is-available' : 'is-empty'}`}>
          {book.stock > 0 ? `In stock: ${book.stock}` : 'Out of stock'}
        </p>
      </div>
      <AddToCartButton book={book} redirectTo={`/books/${book.id}`} />
    </article>
  );
}
