import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AddressForm from '../../components/checkout/AddressForm';
import CheckoutSummary from '../../components/checkout/CheckoutSummary';
import { checkoutService } from '../../services/checkoutService';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState([]);
  const [preview, setPreview] = useState({ items: [], subtotal: 0, shippingFee: 0, total: 0, address: null });

  useEffect(() => {
    checkoutService.getAddresses().then((items) => {
      setAddresses(items);
      checkoutService.preview(items[0]).then(setPreview);
    });
  }, []);

  const pay = async () => {
    const result = await checkoutService.checkout();
    navigate(result.checkoutUrl);
  };

  return (
    <section className="checkout-grid">
      <div className="stack">
        <h1>Checkout Information</h1>
        <div className="panel">
          <h3>Saved address</h3>
          {addresses.map((address) => <p key={address.id}>{address.recipient} - {address.line}, {address.city}</p>)}
        </div>
        <div className="panel">
          <h3>Add address</h3>
          <AddressForm onSubmit={() => checkoutService.preview(addresses[0]).then(setPreview)} />
        </div>
      </div>
      <CheckoutSummary preview={preview} onPay={pay} />
    </section>
  );
}
