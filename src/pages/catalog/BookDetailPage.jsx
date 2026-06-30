import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AddToCartButton from '../../components/catalog/AddToCartButton';
import { ErrorState, LoadingState } from '../../components/ui/State';
import { bookService } from '../../services/bookService';
import { formatCurrency } from '../../utils/formatters';

export default function BookDetailPage() {
  const { id } = useParams();
  const [book, setBook] = useState(null);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;

    bookService
      .getBookById(id)
      .then((result) => {
        if (!active) return;
        setBook(result);
        setError('');
      })
      .catch(() => {
        if (!active) return;
        setBook(null);
        setError('Could not load book detail from backend.');
      });

    return () => {
      active = false;
    };
  }, [id, retryCount]);

  const retryLoadBook = () => {
    setBook(null);
    setError('');
    setRetryCount((count) => count + 1);
  };

  if (!error && String(book?.id || '') !== String(id)) return <LoadingState text="Loading book..." />;
  if (error) {
    return (
      <ErrorState text={error}>
        <button className="btn" type="button" onClick={retryLoadBook}>
          Retry
        </button>
      </ErrorState>
    );
  }
  if (!book) return <ErrorState text="Book not found." />;

  return (
    <section className="detail-grid">
      <img className="detail-cover" src={book.coverUrl} alt={book.title} />
      <div className="stack">
        <Link className="detail-back-link" to="/">
          Back to home page
        </Link>
        <div>
          <span className="badge">{book.category}</span>
        </div>
        <h1 style={{ marginTop: '8px' }}>{book.title}</h1>
        <p className="muted">By <strong style={{ color: 'var(--text)' }}>{book.author}</strong></p>
        <section className="detail-purchase">
          <div className="detail-purchase-heading">
            <span className="muted">Purchase options</span>
            <h2>{formatCurrency(book.price)}</h2>
          </div>
          <div className="detail-stock-row">
            <span className={`stock-badge ${book.stock > 0 ? 'is-available' : 'is-empty'}`}>
              {book.stock > 0 ? 'Available now' : 'Out of stock'}
            </span>
            {book.stock > 0 && <span className="muted">{book.stock} left</span>}
          </div>
          <AddToCartButton book={book} redirectTo={`/books/${book.id}`} />
        </section>
        <section className="detail-section">
          <h2>Description</h2>
          <p>{book.description}</p>
        </section>
      </div>
    </section>
  );
}
