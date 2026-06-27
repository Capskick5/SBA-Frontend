import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CartItemRow from '../../components/cart/CartItemRow';
import Button from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/State';
import { cartService } from '../../services/cartService';
import { formatCurrency } from '../../utils/formatters';

export default function CartPage() {
  const [cart, setCart] = useState({ items: [], subtotal: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    cartService.getCart()
      .then((data) => {
        if (active) setCart(data);
      })
      .catch((err) => console.error("Lỗi lấy giỏ hàng:", err))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!cart.items || cart.items.length === 0) return <EmptyState text="Giỏ hàng đang trống." />;

  return (
    <section className="stack">
      <h1>Giỏ hàng</h1>
      {cart.items.map((item) => (
        <CartItemRow
          key={item.itemId}
          item={item}
          onQuantity={(itemId, quantity) =>
            cartService.updateQuantity(itemId, item.bookId, quantity)
              .then(setCart)
              .catch(() => alert("Không thể cập nhật số lượng!"))
          }
          onRemove={(itemId) =>
            cartService.removeItem(itemId)
              .then(setCart)
              .catch(() => alert("Không thể xóa sản phẩm!"))
          }
        />
      ))}
      <div className="summary-row">
        <strong>Tổng cộng: {formatCurrency(cart.subtotal)}</strong>
        <Link to="/checkout"><Button>Thanh toán (Checkout)</Button></Link>
      </div>
    </section>
  );
}
