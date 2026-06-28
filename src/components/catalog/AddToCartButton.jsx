import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import { ERROR_MESSAGES } from '../../services/apiError';
import { authService } from '../../services/authService';
import { cartService } from '../../services/cartService';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../utils/toast';
import { notifyCartUpdated } from '../../utils/cartEvents';

function getAddToCartErrorMessage(error) {
  if (error?.error_type) {
    return ERROR_MESSAGES[error.error_type] || error.message || 'Could not add this book to cart.';
  }

  return error?.message || 'Could not add this book to cart.';
}

function debounce(func, delay) {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
}

export default function AddToCartButton({ book, redirectTo, className = '' }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const debouncedAddToCart = useRef(
    debounce(async (book) => {
      try {
        const updatedCart = await cartService.addItem(book, 1);
        notifyCartUpdated(updatedCart);
        showToast(`Added "${book.title}" to cart!`);
      } catch (err) {
        const errMsg = getAddToCartErrorMessage(err);
        setError(errMsg);
        showToast(errMsg, 'error');
      } finally {
        setAdding(false);
      }
    }, 500)
  ).current;

  if (user?.role === 'ADMIN') return null;



  const addToCart = () => {
    setError('');

    if (!authService.getCurrentUser()) {
      navigate(`/login?redirect=${encodeURIComponent(redirectTo || `/books/${book.id}`)}`);
      return;
    }

    setAdding(true);
    debouncedAddToCart(book);
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
