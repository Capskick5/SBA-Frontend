import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import AddressForm from '../../components/checkout/AddressForm';
import CheckoutSummary from '../../components/checkout/CheckoutSummary';
import { AuthFormMessage } from '../../components/auth/AuthFormFooter';
import Button from '../../components/ui/Button';
import { CheckCircle2, Home, ShoppingBag, PackageSearch } from 'lucide-react';
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
import {
  checkoutWithCodFallback,
  isCodCheckoutSuccess,
} from '../../utils/codCheckoutMock';
import { orderService } from '../../services/orderService';
import { giftWrapService } from '../../services/giftWrapService';
import { isMockCodOrderResult } from '../../utils/codCheckoutMock';

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

function formatVoucherDiscount(voucher) {
  if (!voucher) return '';
  if (voucher.discountType === 'PERCENTAGE') {
    return `${voucher.discountValue}% off`;
  }
  return `${formatCurrency(voucher.discountValue)} off`;
}

function formatVoucherDate(value) {
  return formatDateTime(value, 'No expiry date');
}

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
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
  const [voucherError, setVoucherError] = useState('');
  const [deliveryMode, setDeliveryMode] = useState('self');
  const [paymentMethod, setPaymentMethod] = useState('VNPAY');
  const [codOrderResult, setCodOrderResult] = useState(null);
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
        title: item.title || fallback?.title || 'Untitled book',
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
        const payload = {
          email: guestEmail || null,
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
        setCheckoutError(err.response?.data?.message || 'Could not calculate shipping fee for this address.');
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
          pendingMessage || 'Could not load checkout information. Please try again.',
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
      setCheckoutError(err.response?.data?.message || 'Could not calculate shipping fee for this address.');
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
      setVoucherError(err.response?.data?.message || 'This voucher cannot be applied to this order.');
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
        setCheckoutError(err.message || 'Could not update the delivery type.');
      }
      return;
    }

    try {
      if (!selectedAddressId) return;
      await refreshPreview(selectedAddressId, cartItemIds, selectedCartItems, selectedVoucherId, mode, guestAddress, giftWrapId);
    } catch (err) {
      console.error('Failed to update delivery type:', err);
      setCheckoutError(err.message || 'Could not update the delivery type.');
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
        setCheckoutError(err.message || 'Could not update the gift wrap selection.');
      }
      return;
    }

    try {
      if (!selectedAddressId) return;
      await refreshPreview(selectedAddressId, cartItemIds, selectedCartItems, selectedVoucherId, 'gift', guestAddress, giftWrapId);
    } catch (err) {
      console.error('Failed to update gift wrap selection:', err);
      setCheckoutError(err.message || 'Could not update the gift wrap selection.');
    }
  };

  const handleContinuePendingPayment = async () => {
    if (!pendingOrder?.id || resumingPayment) return;
    setResumingPayment(true);
    try {
      const paymentLink = await orderService.getPendingPaymentLink(pendingOrder.id);
      window.location.assign(paymentLink.checkoutUrl);
    } catch (err) {
      showToast(err?.message || 'Could not continue this payment. Please try again.', 'error');
      setResumingPayment(false);
    }
  };

  const handleCodSuccess = async (result, { guestCheckout = false, usedMock = false } = {}) => {
    if (guestCheckout) {
      clearGuestCart();
      notifyCartUpdated();
    } else {
      const updatedCart = await cartFacade.getCart().catch(() => null);
      notifyCartUpdated(updatedCart);
    }

    if (usedMock || isMockCodOrderResult(result)) {
      showToast('Could not confirm COD checkout with the server. Showing a local preview only.', 'info');
      setCodOrderResult({ ...result, mock: true });
      return;
    }

    showToast('Order placed successfully. Pay with cash when it arrives.', 'success');
    if (guestCheckout) {
      setCodOrderResult(result);
      return;
    }
    navigate(`/orders/${result.orderId}`);
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

      if (isGuest) {
        if (!isAddressComplete(guestAddress)) {
          setCheckoutError('Add a delivery address to continue to payment.');
          setPaying(false);
          return;
        }
        const { result, usedMock } = await checkoutWithCodFallback({
          paymentMethod,
          preview,
          checkoutCall: () => checkoutService.checkoutGuest({
            email: guestEmail || null,
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

        if (paymentMethod !== 'COD' && result?.checkoutUrl) {
          clearGuestCart();
          window.location.href = result.checkoutUrl;
          return;
        }
        if (isCodCheckoutSuccess(result) || (paymentMethod === 'COD' && usedMock)) {
          await handleCodSuccess(result, { guestCheckout: true, usedMock });
          return;
        }
        setCheckoutError('Guest checkout is not available yet. Please try again later or sign in.');
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
      const { result, usedMock } = await checkoutWithCodFallback({
        paymentMethod,
        preview,
        checkoutCall: () => checkoutService.checkout(
          selectedAddressId,
          cartItemIds,
          key,
          selectedVoucherId || undefined,
          deliveryType,
          deliveryType === 'GIFT' ? selectedGiftWrapId : null,
          paymentMethod,
        ),
      });

      if (paymentMethod !== 'COD' && result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }
      if (isCodCheckoutSuccess(result) || (paymentMethod === 'COD' && usedMock)) {
        await handleCodSuccess(result, { usedMock });
      }
    } catch (err) {
      const pendingMessage = getPendingPaymentUserMessage(err);
      const message = pendingMessage
        || err?.response?.data?.message
        || err?.message
        || 'Checkout failed. Please try again.';
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
      setCheckoutError(err.response?.data?.message || 'Could not delete this address. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const selectedVoucher = vouchers.find((voucher) => String(voucher.id) === String(selectedVoucherId));

  const giftWrapMissing = deliveryMode === 'gift' && !selectedGiftWrapId;
  const canPay = !pendingOrder && !giftWrapMissing && (isGuest
    ? isAddressComplete(guestAddress) && cartItemIds.length > 0
    : Boolean(selectedAddressId) && cartItemIds.length > 0);
  const disabledReason = pendingOrder
    ? PENDING_PAYMENT_MESSAGE
    : giftWrapMissing
      ? 'Select a gift wrap design to continue.'
      : isGuest
        ? (!isAddressComplete(guestAddress) ? 'Confirm a delivery address below to continue to payment.' : '')
        : (!selectedAddressId ? 'Add a delivery address to continue to payment.' : '');

  const codPreviewOnly = isMockCodOrderResult(codOrderResult);

  if (codOrderResult) {
    return (
      <section className="center-panel checkout-cod-success">
        <CheckCircle2 size={64} color="var(--success, #10b981)" />
        <h1>{codPreviewOnly ? 'COD preview' : 'Order placed!'}</h1>
        <p>
          {codPreviewOnly ? (
            <>
              Could not confirm this cash-on-delivery order with the server.
              Reference <strong>{codOrderResult.orderId}</strong> for {formatCurrency(codOrderResult.total)}.
            </>
          ) : (
            <>
              Order #{codOrderResult.orderId} has been placed for {formatCurrency(codOrderResult.total)}.
              Pay with cash when it arrives.
            </>
          )}
        </p>
        {codOrderResult.orderCode && codOrderResult.guestToken && (
          <div className="checkout-cod-tracking">
            <p>
              Your order code is <strong>{codOrderResult.orderCode}</strong>. Use the button below to
              track your order any time — we have also emailed this link to you.
            </p>
            <Link
              to={`/orders/track?code=${encodeURIComponent(codOrderResult.orderCode)}&token=${encodeURIComponent(codOrderResult.guestToken)}`}
            >
              <Button className="btn-secondary">
                <PackageSearch size={18} /> Track your order
              </Button>
            </Link>
          </div>
        )}
        <div className="actions">
          <Link to="/">
            <Button className="btn-secondary">
              <Home size={18} /> Home
            </Button>
          </Link>
          <Link to="/">
            <Button>
              <ShoppingBag size={18} /> Continue shopping
            </Button>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="stack" style={{ gap: '24px' }}>
      <div className="checkout-page-header">
        <Link to="/cart" className="checkout-back-cart-link">
          Back to cart
        </Link>
        <h1>Checkout Information</h1>
      </div>
      {isGuest && (
        <p className="form-message form-message-success">
          Checkout as guest. Have an account?{' '}
          <Link to={`/login?redirect=${encodeURIComponent(loginRedirect)}`}>Log in</Link>
          {' '}to use saved addresses and vouchers.
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
              Continue payment
            </Button>
            <Link className="btn-secondary" to={`/orders/${pendingOrder.id}`}>
              View order #{pendingOrder.id}
            </Link>
          </div>
        </div>
      )}
      <section className="checkout-layout">
        <div className="checkout-sticky-region">
          <div className="checkout-sticky-left stack">
            <div className="panel checkout-delivery-mode">
              <h3>Delivery type</h3>
              <div className="delivery-mode-options" role="group" aria-label="Delivery type">
                <button
                  type="button"
                  className={deliveryMode === 'self' ? 'is-active' : ''}
                  onClick={() => handleDeliveryModeChange('self')}
                >
                  <strong>For myself</strong>
                  <span>Ship this order to me.</span>
                </button>
                <button
                  type="button"
                  className={deliveryMode === 'gift' ? 'is-active' : ''}
                  onClick={() => handleDeliveryModeChange('gift')}
                >
                  <strong>Gift to someone</strong>
                  <span>Ship to another receiver with gift wrapping.</span>
                </button>
              </div>

              {deliveryMode === 'gift' && (
                <div className="gift-wrap-picker">
                  {giftWrapsLoading ? (
                    <p className="muted">Loading gift wrap options...</p>
                  ) : giftWraps.length > 0 ? (
                    <div className="gift-wrap-options" role="radiogroup" aria-label="Gift wrap design">
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
                            <span className="gift-wrap-option-noimage">No image</span>
                          )}
                          <strong>{giftWrap.name}</strong>
                          <span>{formatCurrency(giftWrap.feeVnd)}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="form-message form-message-error">
                      No gift wrap options are available right now. Please choose "For myself" or try again later.
                    </p>
                  )}
                </div>
              )}
            </div>

            {isGuest && (
              <div className="panel">
                <div className="panel-heading">
                  <h3>Contact Information</h3>
                  <p>Enter your email to receive order updates.</p>
                </div>
                <div className="stack" style={{ gap: '12px', marginTop: '12px' }}>
                  <input
                    type="email"
                    placeholder="Email address (optional)"
                    value={guestEmail}
                    onChange={(e) => {
                      setGuestEmail(e.target.value);
                      setEmailError('');
                    }}
                    className="cart-voucher-select"
                    style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid #d1d5db' }}
                  />
                  {emailError && <p className="form-message form-message-error" style={{ margin: 0 }}>{emailError}</p>}
                </div>
              </div>
            )}

            {isGuest ? (
              <div className="panel checkout-delivery-address">
                <div className="panel-heading">
                  <h3>Delivery address</h3>
                  <p>Enter where we should deliver this order. You do not need an account.</p>
                </div>
                {guestAddress && (
                  <article className="selected-address-card">
                    <div>
                      <span>Selected for this order</span>
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
                  submitLabel={guestAddress ? 'Update address' : 'Use this address'}
                  loading={formLoading}
                  showDefaultOption={false}
                />
              </div>
            ) : (
              <div className="panel checkout-delivery-address">
                <div className="panel-heading">
                  <h3>Delivery address</h3>
                  <p>
                    {addresses.length > 0
                      ? 'Review the delivery address selected from your cart.'
                      : 'You do not have any saved address yet. Add a delivery address below.'}
                  </p>
                </div>
                {addresses.length > 0 ? (
                  <>
                    {selectedAddress && (
                      <article className="selected-address-card">
                        <div>
                          <span>Selected for this order</span>
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
                            {showAddressList ? 'Hide' : 'Change'}
                          </Button>
                        </div>
                      </article>
                    )}
                  </>
                ) : (
                  <p className="empty-address-box">No saved address available. Please create one below.</p>
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
                              {Number(selectedAddressId) === address.id && <em>Selected</em>}
                              {address.isDefault && <em>Default</em>}
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
                            {Number(selectedAddressId) === address.id ? 'Selected' : 'Select'}
                          </Button>
                          <Button
                            type="button"
                            className="btn-secondary"
                            onClick={() => startEditingAddress(address.id)}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            className="btn-secondary danger-action"
                            onClick={() => requestDeleteAddress(address)}
                          >
                            Delete
                          </Button>
                        </div>
                        {editingAddressId === address.id && editingAddress && (
                          <div className="saved-address-edit">
                            <div className="panel-heading compact">
                              <h4>Edit saved address</h4>
                              <p>Changes will update this saved address in your account.</p>
                            </div>
                            <AuthFormMessage error={editError} />
                            <AddressForm
                              key={`edit-${editingAddress.id}-${deliveryMode}`}
                              initialValues={editingAddress}
                              submitLabel="Save changes"
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
                  <h3>Voucher</h3>
                  <p>
                    Review the voucher selected from your cart, or choose another available voucher.
                  </p>
                </div>
                {vouchers.length > 0 ? (
                  <>
                    {selectedVoucher ? (
                      <article className="checkout-selected-voucher-card">
                        <div>
                          <span className="voucher-card-label">Applied voucher</span>
                          <strong>{selectedVoucher.code}</strong>
                          <p>{selectedVoucher.name}</p>
                        </div>
                        <dl>
                          <div>
                            <dt>Discount</dt>
                            <dd>{formatVoucherDiscount(selectedVoucher)}</dd>
                          </div>
                          <div>
                            <dt>Minimum subtotal</dt>
                            <dd>{formatCurrency(selectedVoucher.tierMinAmount)}</dd>
                          </div>
                        </dl>
                        <div className="checkout-voucher-actions">
                          <Button type="button" className="btn-secondary" onClick={() => setShowVoucherList((open) => !open)}>
                            {showVoucherList ? 'Hide' : 'Change'}
                          </Button>
                          <Button type="button" className="btn-secondary" onClick={clearVoucher}>
                            Remove
                          </Button>
                        </div>
                      </article>
                    ) : (
                      <div className="voucher-empty-inline">
                        <strong>No voucher selected</strong>
                        <p>You can continue without a voucher or choose one from your account.</p>
                        <Button type="button" className="btn-secondary" onClick={() => setShowVoucherList((open) => !open)}>
                          {showVoucherList ? 'Hide vouchers' : 'Choose voucher'}
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
                                <span className="voucher-card-label">Voucher code</span>
                                <strong>{voucher.code}</strong>
                                <p>{voucher.name}</p>
                              </div>
                              <dl>
                                <div>
                                  <dt>Discount</dt>
                                  <dd>{formatVoucherDiscount(voucher)}</dd>
                                </div>
                                <div>
                                  <dt>Minimum subtotal</dt>
                                  <dd>{formatCurrency(voucher.tierMinAmount)}</dd>
                                </div>
                                <div>
                                  <dt>Expires</dt>
                                  <dd>{formatVoucherDate(voucher.expiresAt)}</dd>
                                </div>
                              </dl>
                              <Button
                                type="button"
                                className={isSelected ? 'btn-secondary' : ''}
                                onClick={() => (isSelected ? clearVoucher() : applyVoucher(voucher.id))}
                              >
                                {isSelected ? 'Applied' : 'Apply voucher'}
                              </Button>
                            </article>
                          );
                        })}
                      </div>
                    )}
                    {selectedVoucher && (
                      <p className="voucher-applied-note">
                        Voucher {selectedVoucher.code} is applied to this checkout.
                      </p>
                    )}
                  </>
                ) : (
                  <div className="voucher-empty-inline">
                    <strong>No available voucher</strong>
                    <p>
                      Complete an eligible paid order first. A voucher can appear in your account for
                      the next purchase.
                    </p>
                  </div>
                )}
                {voucherError && <p className="form-message form-message-error">{voucherError}</p>}
              </div>
            )}

            {isLoggedIn && (
              <div className={`panel checkout-add-address ${!showAddAddress && addresses.length > 0 ? 'collapsed-panel' : ''}`}>
                <div className="panel-heading">
                  <h3>Add delivery address</h3>
                  <p>
                    {addresses.length > 0
                      ? 'Use this only when you want to save another delivery address.'
                      : 'Enter a delivery address before continuing to payment.'}
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
                    Add new address
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
            paymentMethod={paymentMethod}
            onChangePaymentMethod={setPaymentMethod}
          />
        </div>
      </section>

      {addressToDelete && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="delete-address-title">
            <div className="stack">
              <div>
                <h2 id="delete-address-title">Delete address?</h2>
                <p className="muted">
                  This saved address will be removed from your account. You can add a new one later.
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
                  Cancel
                </Button>
                <Button type="button" onClick={confirmDeleteAddress} loading={deleteLoading}>
                  Delete address
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
