import { useState, useRef } from 'react';
import Button from '../ui/Button';
import { ERROR_MESSAGES } from '../../api/apiError';
import { cartFacade } from '../../services/cartFacade';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../utils/toast';
import { notifyCartUpdated } from '../../utils/cartEvents';
import { getPendingPaymentUserMessage } from '../../utils/pendingOrderGuard';

function getAddToCartErrorMessage(error) {
  const pendingMessage = getPendingPaymentUserMessage(error);
  if (pendingMessage) return pendingMessage;

  if (error?.error_type) {
    return error.message || ERROR_MESSAGES[error.error_type] || 'Không thể thêm sách này vào giỏ.';
  }

  return error?.message || 'Không thể thêm sách này vào giỏ.';
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
        showToast(`Đã thêm "${bookToAdd.title}" vào giỏ!`);
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

  const addToCart = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (user?.id) {
      try {
        const { checkServerOrderHistoryAndLock, getLockedTimeRemainingMessage } = await import('../../utils/userLockGuard');
        const lockExpiresAt = await checkServerOrderHistoryAndLock(user.id);
        if (lockExpiresAt) {
          const lockMsg = getLockedTimeRemainingMessage(user.id);
          setError(lockMsg);
          showToast(lockMsg, 'error');
          return;
        }
      } catch (lockErr) {
        console.error(lockErr);
      }
    }

    setError('');
    setAdding(true);
    debouncedAddToCart(book);
  };

  const isOutOfStock = book.stock <= 0;

  return (
    <div className={`add-to-cart-control ${className}`.trim()}>
      <Button onClick={addToCart} disabled={isOutOfStock} loading={adding}>
        {isOutOfStock ? 'Hết hàng' : 'Thêm vào giỏ'}
      </Button>
      {error && <p className="form-hint form-hint-error">{error}</p>}
    </div>
  );
}
