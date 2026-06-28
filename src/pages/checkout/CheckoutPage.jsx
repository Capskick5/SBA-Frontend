import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import AddressForm from '../../components/checkout/AddressForm';
import CheckoutSummary from '../../components/checkout/CheckoutSummary';
import { AuthFormMessage } from '../../components/auth/AuthFormFooter';
import { captureFormError } from '../../utils/formErrorUtils';
import { addressService } from '../../services/addressService';
import { cartService } from '../../services/cartService';
import { checkoutService } from '../../services/checkoutService';

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [cartItemIds, setCartItemIds] = useState([]);
  const [preview, setPreview] = useState({ items: [], subtotal: 0, shippingFee: 0, total: 0 });
  const [formKey, setFormKey] = useState(0);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formFieldErrors, setFormFieldErrors] = useState({});

  const refreshPreview = async (addressId, itemIds) => {
    if (!addressId || itemIds.length === 0) {
      setPreview({ items: [], subtotal: 0, shippingFee: 0, total: 0 });
      return;
    }
    const previewData = await checkoutService.preview(addressId, itemIds);
    setPreview(previewData);
  };

  useEffect(() => {
    let active = true;
    Promise.all([addressService.list(), cartService.getCart()])
      .then(([addrList, cart]) => {
        if (!active) return;
        const cartIds = (cart.items || []).map((item) => item.itemId);
        const requestedIds = (searchParams.get('items') || '')
          .split(',')
          .map((id) => Number(id))
          .filter((id) => cartIds.includes(id));
        const itemIds = requestedIds.length > 0 ? requestedIds : cartIds;
        const defaultAddress = addrList.find((address) => address.isDefault) || addrList[0];

        setAddresses(addrList);
        setCartItemIds(itemIds);
        setSelectedAddressId(defaultAddress?.id || '');

        if (defaultAddress?.id && itemIds.length > 0) {
          return refreshPreview(defaultAddress.id, itemIds);
        }
        setPreview({ items: [], subtotal: 0, shippingFee: 0, total: 0 });
        return null;
      })
      .catch((err) => console.error('Failed to load checkout page:', err));

    return () => {
      active = false;
    };
  }, [searchParams]);

  const handleAddressChange = async (event) => {
    const addressId = Number(event.target.value);
    setSelectedAddressId(addressId);
    try {
      await refreshPreview(addressId, cartItemIds);
    } catch (err) {
      console.error('Failed to load checkout preview:', err);
    }
  };

  const pay = async () => {
    try {
      const key = uuidv4();
      const result = await checkoutService.checkout(selectedAddressId, cartItemIds, key);

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
    } catch (err) {
      alert('Checkout failed: ' + (err.response?.data?.message || 'System error'));
    }
  };

  const handleAddAddress = async (payload) => {
    setFormLoading(true);
    try {
      await addressService.create(payload);
      setFormKey((k) => k + 1);
      const addrList = await addressService.list();
      setAddresses(addrList);
      const defaultAddress = addrList.find((address) => address.isDefault) || addrList[0];
      setSelectedAddressId(defaultAddress?.id || '');
      await refreshPreview(defaultAddress?.id, cartItemIds);
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
          {addresses.length > 0 && (
            <select value={selectedAddressId} onChange={handleAddressChange}>
              {addresses.map((address) => (
                <option key={address.id} value={address.id}>
                  {address.recipient} - {address.line}, {address.city}
                </option>
              ))}
            </select>
          )}
          {addresses.map((address) => (
            <p key={address.id}>{address.recipient} - {address.line}, {address.city}</p>
          ))}
        </div>
        <div className="panel">
          <h3>Add address</h3>
          <AuthFormMessage error={formError} />
          <AddressForm key={formKey} fieldErrors={formFieldErrors} onSubmit={handleAddAddress} loading={formLoading} />
        </div>
      </div>
      <CheckoutSummary preview={preview} onPay={pay} />
    </section>
  );
}
