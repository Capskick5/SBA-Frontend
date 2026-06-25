import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CartItemRow from '../../components/cart/CartItemRow';
import Button from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/State';
import { cartService } from '../../services/cartService';
import { formatCurrency } from '../../utils/formatters';

export default function CartPage() {
  const [cart, setCart] = useState({ items: [], subtotal: 0 });
  const refresh = () => cartService.getCart().then(setCart);

  useEffect(() => { refresh(); }, []);

  if (!cart.items.length) return <EmptyState text="Gio hang dang trong." />;

  return (
    <section className="stack">
      <h1>Cart</h1>
      {cart.items.map((item) => (
        <CartItemRow
          key={item.itemId}
          item={item}
          onQuantity={(itemId, quantity) => cartService.updateQuantity(itemId, quantity).then(setCart)}
          onRemove={(itemId) => cartService.removeItem(itemId).then(setCart)}
        />
      ))}
      <div className="summary-row">
        <strong>Subtotal: {formatCurrency(cart.subtotal)}</strong>
        <Link to="/checkout"><Button>Checkout</Button></Link>
      </div>
    </section>
  );
}
