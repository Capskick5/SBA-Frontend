import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import AddressForm from '../../components/checkout/AddressForm';
import CheckoutSummary from '../../components/checkout/CheckoutSummary';
import { AuthFormMessage } from '../../components/auth/AuthFormFooter';
import Button from '../../components/ui/Button';
import { captureFormError } from '../../utils/formErrorUtils';
import { useAuth } from '../../context/AuthContext';
import { addressService } from '../../services/addressService';
import { cartFacade } from '../../services/cartFacade';
import { checkoutService } from '../../services/checkoutService';
import { voucherService } from '../../services/voucherService';
import { clearGuestCart } from '../../storage/guestCartStorage';
import { notifyCartUpdated } from '../../utils/cartEvents';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { showToast } from '../../utils/toast';
import {
  getPendingPaymentOrder,
  getPendingPaymentUserMessage,
  PENDING_PAYMENT_MESSAGE,
} from '../../utils/pendingOrderGuard';
import { orderService } from '../../services/orderService';
import { giftWrapService } from '../../services/giftWrapService';

function pickCartItemIds(param, cartItems) {
  const cartIds = (cartItems || []).map((item) => item.itemId);
  const requested = (param || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .map((id) => cartIds.find((cartId) => String(cartId) === String(id)))
    .filter((id) => id !== undefined && id !== null);
  return requested.length > 0 ? requested : cartIds;
}

function isAddressComplete(address) {
  return Boolean(
    address?.recipient?.trim()
    && address?.phone?.trim()
    && address?.line?.trim()
    && address?.city?.trim(),
  );
}

function isEmailAddressValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email.trim());
}

function validateGuestEmail(email) {
  const value = email.trim();
  if (!value) return 'Enter your email address to receive order updates.';
  if (!isEmailAddressValid(value)) return 'Enter a valid email address.';
  return '';
}

function formatVoucherDiscount(voucher) {
  if (!voucher) return '';
  if (voucher.discountType === 'PERCENTAGE') {
    return `${voucher.discountValue}% giảm`;
  }
  return `Giảm ${formatCurrency(voucher.discountValue)}`;
}

function formatVoucherDate(value) {
  return formatDateTime(value, 'Không có hạn sử dụng');
}

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const isGuest = !user;
  const [guestAddress, setGuestAddress] = useState(null);
  const [guestEmail, setGuestEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [cartItemIds, setCartItemIds] = useState([]);
  const [selectedCartItems, setSelectedCartItems] = useState([]);
  const [preview, setPreview] = useState({ items: [], subtotal: 0, shippingFee: null, discountAmount: 0, total: 0 });
  const [vouchers, setVouchers] = useState([]);
  const [selectedVoucherId, setSelectedVoucherId] = useState('');
  const [inputVoucherCode, setInputVoucherCode] = useState('');
  const [voucherError, setVoucherError] = useState('');
  const [deliveryMode, setDeliveryMode] = useState('self');
  const [loading, setLoading] = useState(true);
  const [checkoutError, setCheckoutError] = useState('');
  const [formKey, setFormKey] = useState(0);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formFieldErrors, setFormFieldErrors] = useState({});
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState(null);
  const [editFieldErrors, setEditFieldErrors] = useState({});
  const [showAddressList, setShowAddressList] = useState(false);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [showVoucherList, setShowVoucherList] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [pendingOrder, setPendingOrder] = useState(null);
  const [resumingPayment, setResumingPayment] = useState(false);
  const [giftWraps, setGiftWraps] = useState([]);
  const [giftWrapsLoading, setGiftWrapsLoading] = useState(true);
  const [selectedGiftWrapId, setSelectedGiftWrapId] = useState(null);
  const idempotencyKeyRef = useRef(null);

  const selectedAddress = addresses.find((address) => address.id === Number(selectedAddressId));
  const editingAddress = addresses.find((address) => address.id === editingAddressId);
  const deliveryType = deliveryMode === 'gift' ? 'GIFT' : 'SELF';
  const loginRedirect = `${location.pathname}${location.search || ''}`;

  useEffect(() => {
    let active = true;
    giftWrapService.list()
      .then((list) => {
        if (!active) return;
        setGiftWraps(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (active) setGiftWraps([]);
      })
      .finally(() => {
        if (active) setGiftWrapsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const updateStickyTop = () => {
      const navbar = document.querySelector('.navbar');
      const offset = navbar ? navbar.getBoundingClientRect().height + 16 : 112;
      document.documentElement.style.setProperty('--checkout-sticky-top', `${offset}px`);
    };

    updateStickyTop();
    window.addEventListener('resize', updateStickyTop);
    return () => window.removeEventListener('resize', updateStickyTop);
  }, []);

  const buildCartPreview = (items, shippingFee = null, mode = deliveryMode, giftWrapId = selectedGiftWrapId) => {
    const summaryItems = items.map((item) => ({
      bookId: item.bookId,
      title: item.title,
      unitPrice: item.price,
      quantity: item.quantity,
      lineTotal: item.lineTotal || item.price * item.quantity,
    }));
    const subtotal = summaryItems.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
    const hasShipping = typeof shippingFee === 'number';
    const selectedGiftWrap = mode === 'gift' ? giftWraps.find((gw) => gw.id === giftWrapId) : null;
    const giftWrapFee = selectedGiftWrap ? Number(selectedGiftWrap.feeVnd || 0) : 0;

    return {
      items: summaryItems,
      subtotal,
      shippingFee,
      deliveryType: mode === 'gift' ? 'GIFT' : 'SELF',
      giftWrapFee,
      giftWrapId: selectedGiftWrap?.id ?? null,
      giftWrapName: selectedGiftWrap?.name ?? null,
      discountAmount: 0,
      total: subtotal + (hasShipping ? shippingFee : 0) + giftWrapFee,
    };
  };

  const mergePreviewItems = (previewItems, fallbackItems) =>
    (previewItems || []).map((item) => {
      const fallback = fallbackItems.find((cartItem) => cartItem.bookId === item.bookId);
      return {
        ...item,
        title: item.title || fallback?.title || 'Sách chưa có tên',
        unitPrice: item.unitPrice ?? fallback?.price ?? 0,
        quantity: item.quantity ?? fallback?.quantity ?? 1,
        lineTotal: item.lineTotal ?? fallback?.lineTotal ?? 0,
      };
    });



  const refreshPreview = async (
    addressId,
    itemIds,
    fallbackItems = selectedCartItems,
    voucherId = selectedVoucherId,
    mode = deliveryMode,
    guestAddressOverride = guestAddress,
    giftWrapId = selectedGiftWrapId,
  ) => {
    const requestedGiftWrapId = mode === 'gift' ? giftWrapId : null;
    if (!isLoggedIn) {
      if (!guestAddressOverride) {
        setPreview(buildCartPreview(fallbackItems, 0, mode, requestedGiftWrapId));
        return;
      }
      try {
        const previewEmail = isEmailAddressValid(guestEmail) ? guestEmail.trim() : null;
        const payload = {
          email: previewEmail,
          recipient: guestAddressOverride.recipient,
          phone: guestAddressOverride.phone,
          line: guestAddressOverride.line,
          ward: guestAddressOverride.ward || null,
          district: guestAddressOverride.district || null,
          city: guestAddressOverride.city,
          items: fallbackItems.map((item) => ({
            bookId: item.bookId,
            quantity: item.quantity,
          })),
          deliveryType: mode === 'gift' ? 'GIFT' : 'SELF',
          giftWrapId: requestedGiftWrapId,
        };
        const previewData = await checkoutService.previewGuest(payload);
        setPreview({
          ...previewData,
          items: mergePreviewItems(previewData.items, fallbackItems),
        });
      } catch (err) {
        console.error('Failed to load guest preview:', err);
        setCheckoutError(err.response?.data?.message || 'Không thể tính phí vận chuyển cho địa chỉ này.');
      }
      return;
    }
    if (!addressId || itemIds.length === 0) {
      setPreview(buildCartPreview(fallbackItems));
      return;
    }
    const requestedDeliveryType = mode === 'gift' ? 'GIFT' : 'SELF';
    const previewData = await checkoutService.preview(
      addressId,
      itemIds,
      voucherId || undefined,
      requestedDeliveryType,
      requestedGiftWrapId,
    );
    setPreview({
      ...previewData,
      items: mergePreviewItems(previewData.items, fallbackItems),
    });
  };

  useEffect(() => {
    let active = true;
    Promise.resolve().then(async () => {
      setLoading(true);
      setCheckoutError('');

      const cart = await cartFacade.getCart();
      if (!active) return;

      const itemIds = pickCartItemIds(searchParams.get('items'), cart.items || []);
      const selectedItems = (cart.items || []).filter((item) =>
        itemIds.some((id) => String(id) === String(item.itemId)),
      );

      setCartItemIds(itemIds);
      setSelectedCartItems(selectedItems);
      setPreview(buildCartPreview(selectedItems));
      setShowAddressList(false);
      setShowVoucherList(false);

      if (isGuest) {
        setAddresses([]);
        setSelectedAddressId('');
        setVouchers([]);
        setSelectedVoucherId('');
        setShowAddAddress(true);
        setPendingOrder(null);
        if (guestAddress && itemIds.length > 0) {
          await refreshPreview(null, itemIds, selectedItems);
        }
        return;
      }

      const existingPendingOrder = await getPendingPaymentOrder({ force: true });
      if (!active) return;
      if (existingPendingOrder) {
        setPendingOrder(existingPendingOrder);
        setCheckoutError(PENDING_PAYMENT_MESSAGE);
        setAddresses([]);
        setVouchers([]);
        setSelectedAddressId('');
        setSelectedVoucherId('');
        return;
      }
      setPendingOrder(null);

      const [addrList, voucherList] = await Promise.all([
        addressService.list(),
        voucherService.listMine().catch(() => []),
      ]);
      if (!active) return;

      const requestedAddressId = Number(searchParams.get('address'));
      const requestedAddress = addrList.find((address) => address.id === requestedAddressId);
      const defaultAddress = requestedAddress || addrList.find((address) => address.isDefault) || addrList[0];
      const requestedVoucherId = searchParams.get('voucher');
      const requestedVoucher = (voucherList || []).find((voucher) => String(voucher.id) === String(requestedVoucherId));
      const voucherIdToUse = requestedVoucher?.id || '';

      setAddresses(addrList);
      setVouchers(voucherList || []);
      setSelectedVoucherId(voucherIdToUse);
      setVoucherError('');
      setSelectedAddressId(defaultAddress?.id || '');
      setShowAddAddress(addrList.length === 0);

      if (defaultAddress?.id && itemIds.length > 0) {
        await refreshPreview(defaultAddress.id, itemIds, selectedItems, voucherIdToUse);
      }
    })
      .catch((err) => {
        console.error('Failed to load checkout page:', err);
        if (!active) return;
        const pendingMessage = getPendingPaymentUserMessage(err);
        setCheckoutError(
          pendingMessage || 'Không thể tải thông tin thanh toán. Vui lòng thử lại.',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
    // Checkout initialization intentionally reruns when URL or auth mode changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isGuest]);

  const handleGuestAddressSubmit = async (values) => {
    setGuestAddress(values);
    setCheckoutError('');
    await refreshPreview(null, cartItemIds, selectedCartItems, '', deliveryMode, values);
  };

  const handleSelectAddress = async (addressId) => {
    setSelectedAddressId(addressId);
    try {
      await refreshPreview(addressId, cartItemIds, selectedCartItems);
      setCheckoutError('');
      setVoucherError('');
    } catch (err) {
      console.error('Failed to load checkout preview:', err);
      setCheckoutError(err.response?.data?.message || 'Không thể tính phí vận chuyển cho địa chỉ này.');
    }
  };

  const applyVoucher = async (voucherId) => {
    setSelectedVoucherId(voucherId);
    setVoucherError('');
    setCheckoutError('');

    try {
      await refreshPreview(selectedAddressId, cartItemIds, selectedCartItems, voucherId);
      setShowVoucherList(false);
    } catch (err) {
      console.error('Failed to apply voucher:', err);
      setVoucherError(err.response?.data?.message || 'Mã giảm giá này không thể áp dụng cho đơn hàng.');
      setSelectedVoucherId('');
      await refreshPreview(selectedAddressId, cartItemIds, selectedCartItems, '');
    }
  };

  const clearVoucher = async () => {
    setSelectedVoucherId('');
    setVoucherError('');
    await refreshPreview(selectedAddressId, cartItemIds, selectedCartItems, '');
    setShowVoucherList(false);
  };

  const handleApplyVoucherCode = async (e) => {
    e.preventDefault();
    const cleanCode = inputVoucherCode.trim().toUpperCase();
    if (!cleanCode) {
      setVoucherError('Vui lòng nhập mã giảm giá.');
      return;
    }
    setVoucherError('');
    try {
      let targetVoucher = vouchers.find((v) => String(v.voucherCode || '').toUpperCase() === cleanCode);
      if (!targetVoucher) {
        await voucherService.claimByCode(cleanCode);
        const updatedList = await voucherService.listMine().catch(() => []);
        setVouchers(updatedList);
        targetVoucher = updatedList.find((v) => String(v.voucherCode || '').toUpperCase() === cleanCode);
      }
      if (targetVoucher) {
        await applyVoucher(targetVoucher.id);
        setInputVoucherCode('');
        showToast(`Áp dụng mã giảm giá "${cleanCode}" thành công!`);
      } else {
        setVoucherError(`Mã giảm giá "${cleanCode}" không hợp lệ hoặc đã hết hạn.`);
      }
    } catch (err) {
      setVoucherError(err?.message || err?.response?.data?.message || `Không thể áp dụng mã "${cleanCode}".`);
    }
  };

  const handleDeliveryModeChange = async (mode) => {
    setDeliveryMode(mode);
    setCheckoutError('');

    const giftWrapId = mode === 'gift'
      ? (selectedGiftWrapId ?? giftWraps[0]?.id ?? null)
      : selectedGiftWrapId;
    if (mode === 'gift' && giftWrapId !== selectedGiftWrapId) {
      setSelectedGiftWrapId(giftWrapId);
    }

    if (cartItemIds.length === 0) return;

    if (isGuest) {
      if (!guestAddress) {
        // No address yet: recompute the local preview so the gift-wrap fee shows immediately.
        setPreview(buildCartPreview(selectedCartItems, preview.shippingFee, mode, giftWrapId));
        return;
      }
      try {
        await refreshPreview(null, cartItemIds, selectedCartItems, '', mode, guestAddress, giftWrapId);
      } catch (err) {
        console.error('Failed to update guest delivery type:', err);
        setCheckoutError(err.message || 'Không thể cập nhật loại giao hàng.');
      }
      return;
    }

    try {
      if (!selectedAddressId) return;
      await refreshPreview(selectedAddressId, cartItemIds, selectedCartItems, selectedVoucherId, mode, guestAddress, giftWrapId);
    } catch (err) {
      console.error('Failed to update delivery type:', err);
      setCheckoutError(err.message || 'Không thể cập nhật loại giao hàng.');
    }
  };

  const handleGiftWrapSelect = async (giftWrapId) => {
    setSelectedGiftWrapId(giftWrapId);
    setCheckoutError('');
    if (cartItemIds.length === 0) return;

    if (isGuest) {
      if (!guestAddress) {
        setPreview(buildCartPreview(selectedCartItems, preview.shippingFee, 'gift', giftWrapId));
        return;
      }
      try {
        await refreshPreview(null, cartItemIds, selectedCartItems, '', 'gift', guestAddress, giftWrapId);
      } catch (err) {
        console.error('Failed to update gift wrap selection:', err);
        setCheckoutError(err.message || 'Không thể cập nhật lựa chọn gói quà.');
      }
      return;
    }

    try {
      if (!selectedAddressId) return;
      await refreshPreview(selectedAddressId, cartItemIds, selectedCartItems, selectedVoucherId, 'gift', guestAddress, giftWrapId);
    } catch (err) {
      console.error('Failed to update gift wrap selection:', err);
      setCheckoutError(err.message || 'Không thể cập nhật lựa chọn gói quà.');
    }
  };

  const handleContinuePendingPayment = async () => {
    if (!pendingOrder?.id || resumingPayment) return;
    setResumingPayment(true);
    try {
      const paymentLink = await orderService.getPendingPaymentLink(pendingOrder.id);
      window.location.assign(paymentLink.checkoutUrl);
    } catch (err) {
      showToast(err?.message || 'Không thể tiếp tục thanh toán. Vui lòng thử lại.', 'error');
      setResumingPayment(false);
    }
  };

  const pay = async () => {
    if (paying) return;
    if (cartItemIds.length === 0) return;
    setCheckoutError('');
    setPaying(true);

    try {
      // Reuse one idempotency key across retries of the same checkout attempt so a
      // request that succeeded server-side but failed to reach the client (timeout,
      // dropped connection) is deduplicated instead of creating a duplicate order.
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = uuidv4();
      }
      const key = idempotencyKeyRef.current;
      const paymentMethod = 'VNPAY';

      if (isGuest) {
        const guestEmailError = validateGuestEmail(guestEmail);
        if (guestEmailError) {
          setEmailError(guestEmailError);
          setCheckoutError('Enter a valid contact email to continue to payment.');
          setPaying(false);
          return;
        }
        if (!isAddressComplete(guestAddress)) {
          setCheckoutError('Thêm địa chỉ giao hàng để tiếp tục thanh toán.');
          setPaying(false);
          return;
        }
        const result = await checkoutService.checkoutGuest({
          email: guestEmail || null,
          ...guestAddress,
          items: selectedCartItems.map((item) => ({
            bookId: item.bookId,
            quantity: item.quantity,
          })),
          deliveryType,
          giftWrapId: deliveryType === 'GIFT' ? selectedGiftWrapId : null,
          paymentMethod,
          preview,
          checkoutCall: () => checkoutService.checkoutGuest({
            email: guestEmail.trim(),
            ...guestAddress,
            items: selectedCartItems.map((item) => ({
              bookId: item.bookId,
              quantity: item.quantity,
            })),
            deliveryType,
            giftWrapId: deliveryType === 'GIFT' ? selectedGiftWrapId : null,
            paymentMethod,
          }, key),
        });

        if (result?.checkoutUrl) {
          clearGuestCart();
          window.location.href = result.checkoutUrl;
          return;
        }
        setCheckoutError('Thanh toán khách chưa khả dụng. Vui lòng thử lại sau hoặc đăng nhập.');
        return;
      }

      const existingPendingOrder = await getPendingPaymentOrder({ force: true });
      if (existingPendingOrder) {
        setPendingOrder(existingPendingOrder);
        setCheckoutError(PENDING_PAYMENT_MESSAGE);
        showToast(PENDING_PAYMENT_MESSAGE, 'error');
        return;
      }

      if (!selectedAddressId) return;
      const result = await checkoutService.checkout(
        selectedAddressId,
        cartItemIds,
        key,
        selectedVoucherId || undefined,
        deliveryType,
        deliveryType === 'GIFT' ? selectedGiftWrapId : null,
        paymentMethod,
      );

      if (result?.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
    } catch (err) {
      const pendingMessage = getPendingPaymentUserMessage(err);
      const message = pendingMessage
        || err?.response?.data?.message
        || err?.message
        || 'Thanh toán thất bại. Vui lòng thử lại.';
      setCheckoutError(message);
      if (pendingMessage) {
        const existingPendingOrder = await getPendingPaymentOrder({ force: true });
        if (existingPendingOrder) setPendingOrder(existingPendingOrder);
        showToast(pendingMessage, 'error');
      }
    } finally {
      setPaying(false);
    }
  };

  const handleAddAddress = async (payload) => {
    setFormLoading(true);
    setFormError(null);
    setFormFieldErrors({});
    setCheckoutError('');

    try {
      const createdAddress = await addressService.create(payload);
      setFormKey((k) => k + 1);
      const addrList = await addressService.list();
      setAddresses(addrList);
      const addressToUse = addrList.find((address) => address.id === createdAddress?.id)
        || addrList.find((address) => address.isDefault)
        || addrList[0];
      setSelectedAddressId(addressToUse?.id || '');
      await refreshPreview(addressToUse?.id, cartItemIds);
      setShowAddAddress(false);
      setShowAddressList(false);
    } catch (err) {
      captureFormError(err, setFormError, setFormFieldErrors);
    } finally {
      setFormLoading(false);
    }
  };

  const startEditingAddress = (addressId) => {
    setEditingAddressId(addressId);
    setShowAddressList(true);
    setEditError(null);
    setEditFieldErrors({});
  };

  const cancelEditingAddress = () => {
    setEditingAddressId(null);
    setEditError(null);
    setEditFieldErrors({});
  };

  const handleUpdateAddress = async (payload) => {
    if (!editingAddressId) return;
    setEditLoading(true);
    setEditError(null);
    setEditFieldErrors({});
    setCheckoutError('');

    try {
      const updatedAddress = await addressService.update(editingAddressId, payload);
      const addrList = await addressService.list();
      setAddresses(addrList);
      const shouldSelectUpdated = Number(selectedAddressId) === editingAddressId;
      if (shouldSelectUpdated || !selectedAddressId) {
        setSelectedAddressId(updatedAddress?.id || editingAddressId);
        await refreshPreview(updatedAddress?.id || editingAddressId, cartItemIds);
      }
      cancelEditingAddress();
    } catch (err) {
      captureFormError(err, setEditError, setEditFieldErrors);
    } finally {
      setEditLoading(false);
    }
  };

  const requestDeleteAddress = (address) => {
    setAddressToDelete(address);
    setCheckoutError('');
  };

  const cancelDeleteAddress = () => {
    if (deleteLoading) return;
    setAddressToDelete(null);
  };

  const confirmDeleteAddress = async () => {
    if (!addressToDelete) return;
    setDeleteLoading(true);
    setCheckoutError('');

    try {
      await addressService.remove(addressToDelete.id);
      const addrList = await addressService.list();
      setAddresses(addrList);
      setAddressToDelete(null);

      const nextAddress = addrList.find((address) => address.isDefault) || addrList[0];
      setSelectedAddressId(nextAddress?.id || '');
      setShowAddAddress(addrList.length === 0);
      setShowAddressList(false);

      if (editingAddressId === addressToDelete.id) {
        cancelEditingAddress();
      }

      if (nextAddress?.id) {
        await refreshPreview(nextAddress.id, cartItemIds);
      } else {
        setPreview(buildCartPreview(selectedCartItems));
      }
    } catch (err) {
      setCheckoutError(err.response?.data?.message || 'Không thể xóa địa chỉ này. Vui lòng thử lại.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const selectedVoucher = vouchers.find((voucher) => String(voucher.id) === String(selectedVoucherId));

  const giftWrapMissing = deliveryMode === 'gift' && !selectedGiftWrapId;
  const guestEmailValidationMessage = isGuest ? validateGuestEmail(guestEmail) : '';
  const canPay = !pendingOrder && !giftWrapMissing && (isGuest
    ? !guestEmailValidationMessage && isAddressComplete(guestAddress) && cartItemIds.length > 0
    : Boolean(selectedAddressId) && cartItemIds.length > 0);
  const disabledReason = pendingOrder
    ? PENDING_PAYMENT_MESSAGE
    : giftWrapMissing
      ? 'Chọn kiểu gói quà để tiếp tục.'
      : isGuest
        ? (guestEmailValidationMessage || (!isAddressComplete(guestAddress) ? 'Confirm a delivery address below to continue to payment.' : ''))
        : (!selectedAddressId ? 'Add a delivery address to continue to payment.' : '');


  return (
    <div className="checkout-page-wrapper">
      <div className="checkout-page-header">
        <Link to="/cart" className="checkout-back-cart-link">
          Quay lại giỏ hàng
        </Link>
        <h1>Thông tin thanh toán</h1>
      </div>
      {isGuest && (
        <p className="form-message form-message-success">
          Thanh toán với tư cách khách. Đã có tài khoản?{' '}
          <Link to={`/login?redirect=${encodeURIComponent(loginRedirect)}`}>Đăng nhập</Link>
          {' '}để dùng địa chỉ và mã giảm giá đã lưu.
        </p>
      )}
      {checkoutError && <p className="form-message form-message-error">{checkoutError}</p>}
      {pendingOrder && (
        <div className="panel checkout-pending-order-banner">
          <p>{PENDING_PAYMENT_MESSAGE}</p>
          <div className="checkout-pending-order-actions">
            <Button
              type="button"
              loading={resumingPayment}
              onClick={handleContinuePendingPayment}
            >
              Tiếp tục thanh toán
            </Button>
            <Link className="btn-secondary" to={`/orders/${pendingOrder.id}`}>
              Xem đơn #{pendingOrder.id}
            </Link>
          </div>
        </div>
      )}
      <section className="checkout-layout">
        <div className="checkout-sticky-region">
          <div className="checkout-sticky-left stack">
            <div className="panel checkout-delivery-mode">
              <h3>Loại giao hàng</h3>
              <div className="delivery-mode-options" role="group" aria-label="Loại giao hàng">
                <button
                  type="button"
                  className={deliveryMode === 'self' ? 'is-active' : ''}
                  onClick={() => handleDeliveryModeChange('self')}
                >
                  <strong>Cho bản thân</strong>
                  <span>Giao đơn hàng này cho tôi.</span>
                </button>
                <button
                  type="button"
                  className={deliveryMode === 'gift' ? 'is-active' : ''}
                  onClick={() => handleDeliveryModeChange('gift')}
                >
                  <strong>Tặng người khác</strong>
                  <span>Giao cho người nhận khác kèm gói quà.</span>
                </button>
              </div>

              {deliveryMode === 'gift' && (
                <div className="gift-wrap-picker">
                  {giftWrapsLoading ? (
                    <p className="muted">Đang tải tùy chọn gói quà...</p>
                  ) : giftWraps.length > 0 ? (
                    <div className="gift-wrap-options" role="radiogroup" aria-label="Kiểu gói quà">
                      {giftWraps.map((giftWrap) => (
                        <button
                          type="button"
                          key={giftWrap.id}
                          role="radio"
                          aria-checked={selectedGiftWrapId === giftWrap.id}
                          className={`gift-wrap-option${selectedGiftWrapId === giftWrap.id ? ' is-selected' : ''}`}
                          onClick={() => handleGiftWrapSelect(giftWrap.id)}
                        >
                          {giftWrap.imageUrl ? (
                            <img src={giftWrap.imageUrl} alt={giftWrap.name} />
                          ) : (
                            <span className="gift-wrap-option-noimage">Không có ảnh</span>
                          )}
                          <strong>{giftWrap.name}</strong>
                          <span>{formatCurrency(giftWrap.feeVnd)}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="form-message form-message-error">
                      Hiện không có tùy chọn gói quà. Vui lòng chọn "Cho bản thân" hoặc thử lại sau.
                    </p>
                  )}
                </div>
              )}
            </div>

            {isGuest && (
              <div className="panel">
                <div className="panel-heading">
                  <h3>Thông tin liên hệ</h3>
                  <p>Nhập email để nhận cập nhật đơn hàng.</p>
                </div>
                <div className="stack" style={{ gap: '12px', marginTop: '12px' }}>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={guestEmail}
                    onChange={(e) => {
                      const nextEmail = e.target.value;
                      setGuestEmail(nextEmail);
                      if (emailError) {
                        setEmailError(validateGuestEmail(nextEmail));
                      }
                    }}
                    onBlur={(e) => setEmailError(validateGuestEmail(e.target.value))}
                    className="cart-voucher-select"
                    aria-invalid={emailError ? 'true' : undefined}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: 'var(--radius-sm)',
                      border: emailError ? '1px solid var(--error)' : '1px solid #d1d5db',
                      background: emailError ? 'rgba(239, 68, 68, 0.04)' : undefined,
                    }}
                  />
                  {emailError && <p className="field-error" style={{ margin: 0 }}>{emailError}</p>}
                </div>
              </div>
            )}

            {isGuest ? (
              <div className="panel checkout-delivery-address">
                <div className="panel-heading">
                  <h3>Địa chỉ giao hàng</h3>
                  <p>Nhập nơi chúng tôi sẽ giao đơn hàng này. Bạn không cần tài khoản.</p>
                </div>
                {guestAddress && (
                  <article className="selected-address-card">
                    <div>
                      <span>Đã chọn cho đơn này</span>
                      <strong>{guestAddress.recipient}</strong>
                      <p>
                        {guestAddress.line}
                        {guestAddress.ward && `, ${guestAddress.ward}`}
                        {guestAddress.district && `, ${guestAddress.district}`}
                        {guestAddress.city && `, ${guestAddress.city}`}
                      </p>
                      <p>{guestAddress.phone}</p>
                    </div>
                  </article>
                )}
                <AuthFormMessage error={formError} />
                <AddressForm
                  key={`guest-${formKey}-${deliveryMode}`}
                  initialValues={guestAddress || undefined}
                  fieldErrors={formFieldErrors}
                  onSubmit={handleGuestAddressSubmit}
                  submitLabel={guestAddress ? 'Cập nhật địa chỉ' : 'Dùng địa chỉ này'}
                  loading={formLoading}
                  showDefaultOption={false}
                />
              </div>
            ) : (
              <div className="panel checkout-delivery-address">
                <div className="panel-heading">
                  <h3>Địa chỉ giao hàng</h3>
                  <p>
                    {addresses.length > 0
                      ? 'Xem lại địa chỉ giao hàng đã chọn từ giỏ hàng.'
                      : 'Bạn chưa có địa chỉ đã lưu. Thêm địa chỉ giao hàng bên dưới.'}
                  </p>
                </div>
                {addresses.length > 0 ? (
                  <>
                    {selectedAddress && (
                      <article className="selected-address-card">
                        <div>
                          <span>Đã chọn cho đơn này</span>
                          <strong>{selectedAddress.recipient}</strong>
                          <p>
                            {selectedAddress.line}
                            {selectedAddress.ward && `, ${selectedAddress.ward}`}
                            {selectedAddress.district && `, ${selectedAddress.district}`}
                            {selectedAddress.city && `, ${selectedAddress.city}`}
                          </p>
                        </div>
                        <div className="selected-address-card-actions">
                          <Button
                            type="button"
                            className="btn-secondary"
                            onClick={() => setShowAddressList((open) => !open)}
                          >
                            {showAddressList ? 'Ẩn' : 'Thay đổi'}
                          </Button>
                        </div>
                      </article>
                    )}
                  </>
                ) : (
                  <p className="empty-address-box">Chưa có địa chỉ đã lưu. Vui lòng tạo địa chỉ bên dưới.</p>
                )}
                {showAddressList && (
                  <div className="saved-address-list">
                    {addresses.map((address) => (
                      <article
                        className={`saved-address-card ${Number(selectedAddressId) === address.id ? 'is-selected' : ''}`}
                        key={address.id}
                      >
                        <div className="saved-address-card-body">
                          <span className="saved-address-main">
                            <strong>{address.recipient}</strong>
                            <span>
                              {Number(selectedAddressId) === address.id && <em>Đã chọn</em>}
                              {address.isDefault && <em>Mặc định</em>}
                            </span>
                          </span>
                          <span>{address.phone}</span>
                          <span>
                            {address.line}
                            {address.ward && `, ${address.ward}`}
                            {address.district && `, ${address.district}`}
                            {address.city && `, ${address.city}`}
                          </span>
                        </div>
                        <div className="saved-address-actions">
                          <Button
                            type="button"
                            className="btn-secondary"
                            onClick={() => handleSelectAddress(address.id)}
                            disabled={Number(selectedAddressId) === address.id}
                          >
                            {Number(selectedAddressId) === address.id ? 'Đã chọn' : 'Chọn'}
                          </Button>
                          <Button
                            type="button"
                            className="btn-secondary"
                            onClick={() => startEditingAddress(address.id)}
                          >
                            Sửa
                          </Button>
                          <Button
                            type="button"
                            className="btn-secondary danger-action"
                            onClick={() => requestDeleteAddress(address)}
                          >
                            Xóa
                          </Button>
                        </div>
                        {editingAddressId === address.id && editingAddress && (
                          <div className="saved-address-edit">
                            <div className="panel-heading compact">
                              <h4>Sửa địa chỉ đã lưu</h4>
                              <p>Thay đổi sẽ cập nhật địa chỉ này trong tài khoản của bạn.</p>
                            </div>
                            <AuthFormMessage error={editError} />
                            <AddressForm
                              key={`edit-${editingAddress.id}-${deliveryMode}`}
                              initialValues={editingAddress}
                              submitLabel="Lưu thay đổi"
                              fieldErrors={editFieldErrors}
                              onSubmit={handleUpdateAddress}
                              loading={editLoading}
                              onCancel={cancelEditingAddress}
                            />
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {isLoggedIn && (
              <div className="panel checkout-voucher-panel">
                <div className="panel-heading">
                  <h3>Mã giảm giá</h3>
                  <p>
                    Chọn mã giảm giá bạn đã thu thập trong ví voucher cá nhân để áp dụng cho đơn hàng.
                  </p>
                </div>

                {vouchers.length > 0 ? (
                  <>
                    {selectedVoucher ? (
                      <article className="checkout-selected-voucher-card">
                        <div>
                          <span className="voucher-card-label">Mã đã áp dụng</span>
                          <strong>{selectedVoucher.voucherCode}</strong>
                          <p>{selectedVoucher.voucherName}</p>
                        </div>
                        <dl>
                          <div>
                            <dt>Giảm giá</dt>
                            <dd>{formatVoucherDiscount(selectedVoucher)}</dd>
                          </div>
                          <div>
                            <dt>Đơn tối thiểu</dt>
                            <dd>{formatCurrency(selectedVoucher.minOrderValue)}</dd>
                          </div>
                        </dl>
                        <div className="checkout-voucher-actions">
                          <Button type="button" className="btn-secondary" onClick={() => setShowVoucherList((open) => !open)}>
                            {showVoucherList ? 'Ẩn ví voucher' : 'Thay đổi mã khác'}
                          </Button>
                          <Button type="button" className="btn-secondary" onClick={clearVoucher}>
                            Gỡ bỏ
                          </Button>
                        </div>
                      </article>
                    ) : (
                      <div className="voucher-empty-inline">
                        <strong>Chưa chọn mã giảm giá</strong>
                        <p>Bạn có thể chọn một mã giảm giá đã thu thập từ ví voucher cá nhân.</p>
                        <Button type="button" className="btn-secondary" onClick={() => setShowVoucherList((open) => !open)}>
                          {showVoucherList ? 'Ẩn ví voucher' : 'Chọn mã từ ví voucher'}
                        </Button>
                      </div>
                    )}
                    {showVoucherList && (
                      <div className="checkout-voucher-list">
                        {vouchers.map((voucher) => {
                          const isSelected = String(voucher.id) === String(selectedVoucherId);
                          return (
                            <article className={`checkout-voucher-card${isSelected ? ' is-selected' : ''}`} key={voucher.id}>
                              <div>
                                <span className="voucher-card-label">Mã voucher</span>
                                <strong>{voucher.voucherCode}</strong>
                                <p>{voucher.voucherName}</p>
                              </div>
                              <dl>
                                <div>
                                  <dt>Giảm giá</dt>
                                  <dd>{formatVoucherDiscount(voucher)}</dd>
                                </div>
                                <div>
                                  <dt>Đơn tối thiểu</dt>
                                  <dd>{formatCurrency(voucher.minOrderValue)}</dd>
                                </div>
                                <div>
                                  <dt>Hạn sử dụng</dt>
                                  <dd>{formatVoucherDate(voucher.expiresAt)}</dd>
                                </div>
                              </dl>
                              <Button
                                type="button"
                                className={isSelected ? 'btn-secondary' : ''}
                                onClick={() => (isSelected ? clearVoucher() : applyVoucher(voucher.id))}
                              >
                                {isSelected ? 'Đã áp dụng' : 'Áp dụng mã này'}
                              </Button>
                            </article>
                          );
                        })}
                      </div>
                    )}
                    {selectedVoucher && (
                      <p className="voucher-applied-note">
                        Mã giảm giá {selectedVoucher.voucherCode} đang được áp dụng cho đơn hàng này.
                      </p>
                    )}
                  </>
                ) : (
                  <div className="voucher-empty-inline">
                    <strong>Chưa có mã giảm giá trong ví</strong>
                    <p>
                      Hãy khám phá các chương trình khuyến mãi tại Trang chủ và bấm "Thu thập" để nhận mã vào ví voucher của bạn.
                    </p>
                  </div>
                )}
                {voucherError && <p className="form-message form-message-error" style={{ marginTop: '12px' }}>{voucherError}</p>}
              </div>
            )}

            {isLoggedIn && (
              <div className={`panel checkout-add-address ${!showAddAddress && addresses.length > 0 ? 'collapsed-panel' : ''}`}>
                <div className="panel-heading">
                  <h3>Thêm địa chỉ giao hàng</h3>
                  <p>
                    {addresses.length > 0
                      ? 'Chỉ dùng khi bạn muốn lưu thêm một địa chỉ giao hàng khác.'
                      : 'Nhập địa chỉ giao hàng trước khi tiếp tục thanh toán.'}
                  </p>
                </div>
                {showAddAddress ? (
                  <>
                    <AuthFormMessage error={formError} />
                    <AddressForm
                      key={`${formKey}-${deliveryMode}`}
                      fieldErrors={formFieldErrors}
                      onSubmit={handleAddAddress}
                      loading={formLoading}
                    />
                  </>
                ) : (
                  <Button type="button" onClick={() => setShowAddAddress(true)}>
                    Thêm địa chỉ mới
                  </Button>
                )}
              </div>
            )}
          </div>

          <CheckoutSummary
            preview={preview}
            loading={loading || paying}
            canPay={canPay}
            disabledReason={disabledReason}
            onPay={pay}
          />
        </div>
      </section>

      {addressToDelete && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="delete-address-title">
            <div className="stack">
              <div>
                <h2 id="delete-address-title">Xóa địa chỉ?</h2>
                <p className="muted">
                  Địa chỉ đã lưu này sẽ bị xóa khỏi tài khoản. Bạn có thể thêm địa chỉ mới sau.
                </p>
              </div>
              <div className="delete-address-preview">
                <strong>{addressToDelete.recipient}</strong>
                <span>{addressToDelete.phone}</span>
                <span>
                  {addressToDelete.line}
                  {addressToDelete.ward && `, ${addressToDelete.ward}`}
                  {addressToDelete.district && `, ${addressToDelete.district}`}
                  {addressToDelete.city && `, ${addressToDelete.city}`}
                </span>
              </div>
              <div className="actions">
                <Button type="button" className="btn-secondary" onClick={cancelDeleteAddress} disabled={deleteLoading}>
                  Hủy
                </Button>
                <Button type="button" onClick={confirmDeleteAddress} loading={deleteLoading}>
                  Xóa địa chỉ
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
