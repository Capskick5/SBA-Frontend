export default function PaymentMethodSelector({ value, onChange }) {
  return (
    <div className="panel">
      <h3>Payment Method</h3>
      <label className="check">
        <input
          type="radio"
          name="paymentMethod"
          value="PAYOS"
          checked={value === 'PAYOS'}
          onChange={(event) => onChange(event.target.value)}
        />
        PayOS payment link
      </label>
      <label className="check">
        <input
          type="radio"
          name="paymentMethod"
          value="MOCK_TRANSFER"
          checked={value === 'MOCK_TRANSFER'}
          onChange={(event) => onChange(event.target.value)}
        />
        Mock bank transfer wireframe
      </label>
    </div>
  );
}
