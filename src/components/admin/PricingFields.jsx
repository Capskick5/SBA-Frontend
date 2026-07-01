import { useState } from 'react';
import Input from '../ui/Input';
import { computePriceFromDiscount } from '../../utils/pricing';
import { formatCurrency } from '../../utils/formatters';

export default function PricingFields({
  initialOriginalPrice = '',
  initialDiscountPercent = 0,
}) {
  const [originalPrice, setOriginalPrice] = useState(initialOriginalPrice);
  const [discountPercent, setDiscountPercent] = useState(initialDiscountPercent);

  const computedPrice = computePriceFromDiscount(originalPrice, discountPercent);

  return (
    <>
      <input type="hidden" name="originalPrice" value={originalPrice} />
      <input type="hidden" name="price" value={computedPrice} />
      <Input
        label="Original Price"
        type="number"
        min="0"
        required
        value={originalPrice}
        onChange={(event) => setOriginalPrice(event.target.value)}
      />
      <Input
        label="Discount (%)"
        type="number"
        min="0"
        max="100"
        value={discountPercent}
        onChange={(event) => setDiscountPercent(event.target.value)}
      />
      <label className="field">
        <span>Price</span>
        <input type="text" readOnly value={formatCurrency(computedPrice)} />
      </label>
    </>
  );
}
