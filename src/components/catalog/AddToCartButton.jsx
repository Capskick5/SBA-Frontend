import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import { ERROR_MESSAGES } from '../../services/apiError';
import { authService } from '../../services/authService';
import { cartService } from '../../services/cartService';
import { useAuth } from '../../context/AuthContext';

function getAddToCartErrorMessage(error) {
  if (error?.error_type) {
    return ERROR_MESSAGES[error.error_type] || error.message || 'Could not add this book to cart.';
  }

  return error?.message || 'Could not add this book to cart.';
}

export default function AddToCartButton({ book, redirectTo, className = '' }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  if (user?.role === 'ADMIN') return null;

  const addToCart = async () => {
    setError('');

    if (!authService.getCurrentUser()) {
      navigate(`/login?redirect=${encodeURIComponent(redirectTo || `/books/${book.id}`)}`);
      return;
    }

    try {
      setAdding(true);
      await cartService.addItem(book, 1);
      navigate('/cart');
    } catch (err) {
      setError(getAddToCartErrorMessage(err));
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className={`add-to-cart-control ${className}`.trim()}>
      <Button onClick={addToCart} disabled={book.stock === 0} loading={adding}>
        Add to Cart
      </Button>
      {error && <p className="form-hint form-hint-error">{error}</p>}
    </div>
  );
}
