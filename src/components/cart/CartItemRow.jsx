import { Link } from 'react-router-dom';
import { Trash2, Minus, Plus } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export default function CartItemRow({ item, selected, error, onSelect, onQuantity, onRemove }) {
  const hasDiscount = item.originalPrice && item.originalPrice > item.price;
  const atStockLimit = item.stock != null && item.quantity >= item.stock;

  return (
    <div className={`cart-item-row${!item.available ? ' cart-item-unavailable' : ''}`}>
      <div className="cart-item-check-col">
        <input
          type="checkbox"
          className="cart-checkbox"
          checked={selected}
          onChange={onSelect}
          disabled={!item.available}
          aria-label={`Chọn ${item.title}`}
        />
      </div>

      <Link className="cart-item-cover" to={`/books/${item.bookId}`} aria-label={`Xem ${item.title}`}>
        <img src={item.coverUrl} alt={item.title} loading="lazy" />
      </Link>

      <div className="cart-item-info">
        <Link className="cart-item-title" to={`/books/${item.bookId}`}>
          {item.title}
        </Link>
        {!item.available && <span className="cart-item-oos">Hết hàng</span>}
        {error && <p className="cart-item-error">{error}</p>}
      </div>

      <div className="cart-item-price-col">
        <span className="cart-price-current">{formatCurrency(item.price)}</span>
        {hasDiscount && (
          <span className="cart-price-original">{formatCurrency(item.originalPrice)}</span>
        )}
      </div>

      <div className="cart-item-qty-col">
        <div className="cart-qty-stepper">
          <button
            type="button"
            className="cart-qty-btn"
            onClick={() => onQuantity(item.itemId, item.quantity - 1)}
            disabled={item.quantity <= 1 || !item.available}
            aria-label="Giảm số lượng"
          >
            <Minus size={12} />
          </button>
          <span className="cart-qty-value">{item.quantity}</span>
          <button
            type="button"
            className="cart-qty-btn"
            onClick={() => onQuantity(item.itemId, item.quantity + 1)}
            disabled={!item.available || atStockLimit}
            aria-label="Tăng số lượng"
          >
            <Plus size={12} />
          </button>
        </div>
      </div>

      <div className="cart-item-total-col">
        <span className="cart-line-total">{formatCurrency(item.lineTotal)}</span>
      </div>

      <div className="cart-item-action-col">
        <button
          type="button"
          className="cart-remove-btn"
          onClick={() => onRemove(item.itemId)}
          aria-label={`Xóa ${item.title}`}
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}
