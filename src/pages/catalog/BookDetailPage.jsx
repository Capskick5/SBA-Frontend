import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/ui/Button';
import ReviewList from '../../components/reviews/ReviewList';
import ReviewForm from '../../components/reviews/ReviewForm';
import { authService } from '../../services/authService';
import { bookService } from '../../services/bookService';
import { cartService } from '../../services/cartService';
import { reviewService } from '../../services/reviewService';
import { formatCurrency } from '../../utils/formatters';

export default function BookDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    bookService.getBookById(id).then(setBook);
    reviewService.getReviewsByBookId(id).then(setReviews);
  }, [id]);

  if (!book) return <p>Book not found.</p>;

  const addToCart = async () => {
    if (!authService.getCurrentUser()) {
      navigate(`/login?redirect=/books/${book.id}`);
      return;
    }
    await cartService.addItem(book, 1);
    navigate('/cart');
  };

  return (
    <section className="detail-grid">
      <img className="detail-cover" src={book.coverUrl} alt={book.title} />
      <div className="stack">
        <p className="muted">{book.category}</p>
        <h1>{book.title}</h1>
        <p>{book.author}</p>
        <section className="detail-purchase">
          <h2>{formatCurrency(book.price)}</h2>
          <p className={`stock-badge ${book.stock > 0 ? 'is-available' : 'is-empty'}`}>
            {book.stock > 0 ? `In stock: ${book.stock}` : 'Out of stock'}
          </p>
          <Button onClick={addToCart} disabled={book.stock === 0}>Add to Cart</Button>
        </section>
        <section className="detail-section">
          <h2>Description</h2>
          <p>{book.description}</p>
        </section>
        <h2>Reviews</h2>
        <ReviewList reviews={reviews} />
        <ReviewForm />
      </div>
    </section>
  );
}
