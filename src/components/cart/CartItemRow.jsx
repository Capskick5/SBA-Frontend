import Button from '../ui/Button';
import { formatCurrency } from '../../utils/formatters';

export default function CartItemRow({ item, selected, error, onSelect, onQuantity, onRemove }) {
  return (
    <div className="cart-row">
      <input
        className="cart-row-check"
        type="checkbox"
        checked={selected}
        onChange={onSelect}
        aria-label={`Select ${item.title}`}
      />
      <img src={item.coverUrl} alt={item.title} />
      <div>
        <strong>{item.title}</strong>
        <p>{formatCurrency(item.price)}</p>
      </div>
      <div className="quantity">
        <Button
          type="button"
          className="quantity-btn"
          onClick={() => onQuantity(item.itemId, item.quantity - 1)}
          disabled={item.quantity <= 1}
        >
          -
        </Button>
        <span>{item.quantity}</span>
        <Button
          type="button"
          className="quantity-btn"
          onClick={() => onQuantity(item.itemId, item.quantity + 1)}
        >
          +
        </Button>
      </div>
      <strong>{formatCurrency(item.lineTotal)}</strong>
      <Button type="button" className="cart-remove-btn" onClick={() => onRemove(item.itemId)}>Remove</Button>
      {error && <p className="cart-row-error">{error}</p>}
    </div>
  );
}
