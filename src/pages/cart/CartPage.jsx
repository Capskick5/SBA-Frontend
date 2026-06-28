import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CartItemRow from '../../components/cart/CartItemRow';
import Button from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/State';
import { cartService } from '../../services/cartService';
import { formatCurrency } from '../../utils/formatters';

export default function CartPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState({ items: [], subtotal: 0 });
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [loading, setLoading] = useState(true);

  const syncCart = (nextCart, options = {}) => {
    setCart(nextCart);
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
  if (!cart.items || cart.items.length === 0) return <EmptyState text="Your cart is empty." />;

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
          onSelect={() => toggleItem(item.itemId)}
          onQuantity={(itemId, quantity) =>
            cartService.updateQuantity(itemId, item.bookId, quantity)
              .then(syncCart)
              .catch(() => alert('Could not update quantity.'))
          }
          onRemove={(itemId) =>
            cartService.removeItem(itemId)
              .then(syncCart)
              .catch(() => alert('Could not remove this item.'))
          }
        />
      ))}
      <div className="summary-row">
        <strong>Selected total: {formatCurrency(selectedTotal)}</strong>
        <Button onClick={goToCheckout} disabled={selectedItemIds.length === 0}>
          Checkout ({selectedItemIds.length})
        </Button>
      </div>
    </section>
  );
}
