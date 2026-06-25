import Button from '../ui/Button';
import { formatCurrency } from '../../utils/formatters';

export default function CartItemRow({ item, onQuantity, onRemove }) {
  return (
    <div className="cart-row">
      <img src={item.coverUrl} alt={item.title} />
      <div>
        <strong>{item.title}</strong>
        <p>{formatCurrency(item.price)}</p>
      </div>
      <div className="quantity">
        <Button onClick={() => onQuantity(item.itemId, item.quantity - 1)}>-</Button>
        <span>{item.quantity}</span>
        <Button onClick={() => onQuantity(item.itemId, item.quantity + 1)}>+</Button>
      </div>
      <strong>{formatCurrency(item.lineTotal)}</strong>
      <Button onClick={() => onRemove(item.itemId)}>Remove</Button>
    </div>
  );
}
