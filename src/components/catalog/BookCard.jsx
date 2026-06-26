import { Link, useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import { authService } from '../../services/authService';
import { cartService } from '../../services/cartService';
import { formatCurrency } from '../../utils/formatters';

export default function BookCard({ book }) {
  const navigate = useNavigate();
  const addToCart = async () => {
    if (!authService.getCurrentUser()) {
      navigate(`/login?redirect=/books/${book.id}`);
      return;
    }
    await cartService.addItem(book, 1);
    navigate('/cart');
  };

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
      <div className="actions">
        <Button onClick={addToCart} disabled={book.stock === 0}>Add to Cart</Button>
      </div>
    </article>
  );
}
