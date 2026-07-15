import { useState, useRef } from 'react';
import Button from '../ui/Button';
import { ERROR_MESSAGES } from '../../services/apiError';
import { cartFacade } from '../../services/cartFacade';
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

export default function AddToCartButton({ book, className = '' }) {
  const { user } = useAuth();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const debouncedAddToCart = useRef(
    debounce(async (bookToAdd) => {
      try {
        const updatedCart = await cartFacade.addItem(bookToAdd, 1);
        notifyCartUpdated(updatedCart);
        showToast(`Added "${bookToAdd.title}" to cart!`);
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

  const addToCart = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setError('');
    setAdding(true);
    debouncedAddToCart(book);
  };

  const isOutOfStock = book.stock <= 0;

  return (
    <div className={`add-to-cart-control ${className}`.trim()}>
      <Button onClick={addToCart} disabled={isOutOfStock} loading={adding}>
        {isOutOfStock ? 'Out of stock' : 'Add to Cart'}
      </Button>
      {error && <p className="form-hint form-hint-error">{error}</p>}
    </div>
  );
}
