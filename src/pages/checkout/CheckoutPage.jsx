import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AddressForm from '../../components/checkout/AddressForm';
import CheckoutSummary from '../../components/checkout/CheckoutSummary';
import { AuthFormMessage } from '../../components/auth/AuthFormFooter';
import { captureFormError } from '../../components/auth/authFormUtils';
import { addressService } from '../../services/addressService';
import { checkoutService } from '../../services/checkoutService';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState([]);
  const [preview, setPreview] = useState({ items: [], subtotal: 0, shippingFee: 0, total: 0, address: null });
  const [formKey, setFormKey] = useState(0);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formFieldErrors, setFormFieldErrors] = useState({});

  const refresh = async () => {
    const items = await checkoutService.getAddresses();
    setAddresses(items);
    checkoutService.preview(items[0]).then(setPreview);
  };

  useEffect(() => {
    checkoutService.getAddresses().then((items) => {
      setAddresses(items);
      return checkoutService.preview(items[0]);
    }).then(setPreview);
  }, []);

  const pay = async () => {
    const result = await checkoutService.checkout();
    navigate(result.checkoutUrl);
  };

  const handleAddAddress = async (payload) => {
    setFormLoading(true);
    setFormError(null);
    setFormFieldErrors({});
    try {
      await addressService.create(payload);
      setFormKey((k) => k + 1);
      await refresh();
    } catch (err) {
      captureFormError(err, setFormError, setFormFieldErrors);
    } finally {
      setFormLoading(false);
    }
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
          <AuthFormMessage error={formError} />
          <AddressForm
            key={formKey}
            fieldErrors={formFieldErrors}
            onSubmit={handleAddAddress}
            loading={formLoading}
          />
        </div>
      </div>
      <CheckoutSummary preview={preview} onPay={pay} />
    </section>
  );
}
