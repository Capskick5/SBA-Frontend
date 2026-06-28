import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CartItemRow from '../../components/cart/CartItemRow';
import Button from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/State';
import { cartService } from '../../services/cartService';
import { notifyCartUpdated } from '../../utils/cartEvents';
import { formatCurrency } from '../../utils/formatters';

export default function CartPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState({ items: [], subtotal: 0 });
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [itemErrors, setItemErrors] = useState({});
  const [loading, setLoading] = useState(true);

  const syncCart = (nextCart, options = {}) => {
    setCart(nextCart);
    notifyCartUpdated(nextCart);
    setSelectedItemIds((currentIds) => {
      const validIds = (nextCart.items || []).map((item) => item.itemId);
      if (options.selectAll) return validIds;
      return currentIds.filter((id) => validIds.includes(id));
    });
  };

  useEffect(() => {
    let active = true;
    cartService.getCart()
      .then((data) => {
        if (active) syncCart(data, { selectAll: true });
      })
      .catch((err) => console.error('Failed to load cart:', err))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!cart.items || cart.items.length === 0) {
    return (
      <section className="stack">
        <EmptyState text="Your cart is empty." />
        <Button onClick={() => navigate('/')}>Continue Shopping</Button>
      </section>
    );
  }

  const selectedItems = cart.items.filter((item) => selectedItemIds.includes(item.itemId));
  const selectedTotal = selectedItems.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
  const allSelected = selectedItemIds.length === cart.items.length;

  const toggleItem = (itemId) => {
    setSelectedItemIds((currentIds) =>
      currentIds.includes(itemId)
        ? currentIds.filter((id) => id !== itemId)
        : [...currentIds, itemId]
    );
  };

  const toggleAll = () => {
    setSelectedItemIds(allSelected ? [] : cart.items.map((item) => item.itemId));
  };

  const clearItemError = (itemId) => {
    setItemErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      delete nextErrors[itemId];
      return nextErrors;
    });
  };

  const setItemError = (itemId, message) => {
    setItemErrors((currentErrors) => ({
      ...currentErrors,
      [itemId]: message,
    }));
  };

  const handleQuantityChange = (item, quantity) => {
    clearItemError(item.itemId);
    cartService.updateQuantity(item.itemId, item.bookId, quantity)
      .then((nextCart) => {
        syncCart(nextCart);
        clearItemError(item.itemId);
      })
      .catch(() => {
        const message = quantity > item.quantity
          ? 'Maximum available stock reached for this book.'
          : 'Could not update quantity. Please try again.';
        setItemError(item.itemId, message);
      });
  };

  const handleRemove = (itemId) => {
    clearItemError(itemId);
    cartService.removeItem(itemId)
      .then((nextCart) => {
        syncCart(nextCart);
        clearItemError(itemId);
      })
      .catch(() => setItemError(itemId, 'Could not remove this item. Please try again.'));
  };

  const goToCheckout = () => {
    if (selectedItemIds.length === 0) return;
    navigate(`/checkout?items=${selectedItemIds.join(',')}`);
  };

  return (
    <section className="stack">
      <h1>Cart</h1>
      <label className="cart-select-all">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={toggleAll}
        />
        <span>Select all ({cart.items.length})</span>
      </label>
      {cart.items.map((item) => (
        <CartItemRow
          key={item.itemId}
          item={item}
          selected={selectedItemIds.includes(item.itemId)}
          error={itemErrors[item.itemId]}
          onSelect={() => toggleItem(item.itemId)}
          onQuantity={(_, quantity) => handleQuantityChange(item, quantity)}
          onRemove={handleRemove}
        />
      ))}
      <div className="summary-row">
        <Button onClick={() => navigate('/')}>Continue Shopping</Button>
        <strong>Selected total: {formatCurrency(selectedTotal)}</strong>
        <Button onClick={goToCheckout} disabled={selectedItemIds.length === 0}>
          Checkout ({selectedItemIds.length})
        </Button>
      </div>
    </section>
  );
}
