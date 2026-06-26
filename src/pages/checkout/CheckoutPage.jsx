import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import AddressForm from '../../components/checkout/AddressForm';
import CheckoutSummary from '../../components/checkout/CheckoutSummary';
import { AuthFormMessage } from '../../components/auth/AuthFormFooter';
import { captureFormError } from '../../utils/formErrorUtils';
import { addressService } from '../../services/addressService';
import { checkoutService } from '../../services/checkoutService';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState([]);
  const [preview, setPreview] = useState({ items: [], subtotal: 0, shippingFee: 0, total: 0 });
  const [formKey, setFormKey] = useState(0);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formFieldErrors, setFormFieldErrors] = useState({});

  // Cần lấy danh sách cartItemIds từ đâu đó (ví dụ: giỏ hàng hoặc state)
  const cartItemIds = [1, 2]; // Tạm ví dụ, bạn hãy thay bằng list ID thực tế

  const refresh = async () => {
    try {
      const addrList = await addressService.list();
      setAddresses(addrList);
      if (addrList.length > 0) {
        const previewData = await checkoutService.preview(addrList[0].id, cartItemIds);
        setPreview(previewData);
      }
    } catch (err) {
      console.error("Lỗi tải trang checkout:", err);
    }
  };

  useEffect(() => { refresh(); }, []);

  const pay = async () => {
    try {
      const key = uuidv4();
      const addressId = addresses[0]?.id;
      const result = await checkoutService.checkout(addressId, cartItemIds, key);

      // Redirect sang cổng thanh toán VNPAY từ backend
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
    } catch (err) {
      alert("Checkout thất bại: " + (err.response?.data?.message || "Lỗi hệ thống"));
    }
  };

  const handleAddAddress = async (payload) => {
    setFormLoading(true);
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