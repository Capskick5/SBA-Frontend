import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import AddressForm from '../../components/checkout/AddressForm';
import CheckoutSummary from '../../components/checkout/CheckoutSummary';
import { AuthFormMessage } from '../../components/auth/AuthFormFooter';
import Button from '../../components/ui/Button';
import { captureFormError } from '../../utils/formErrorUtils';
import { addressService } from '../../services/addressService';
import { cartService } from '../../services/cartService';
import { checkoutService } from '../../services/checkoutService';
import { voucherService } from '../../services/voucherService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

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
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [cartItemIds, setCartItemIds] = useState([]);
  const [selectedCartItems, setSelectedCartItems] = useState([]);
  const [preview, setPreview] = useState({ items: [], subtotal: 0, shippingFee: null, discountAmount: 0, total: 0 });
  const [vouchers, setVouchers] = useState([]);
  const [selectedVoucherId, setSelectedVoucherId] = useState('');
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

  const selectedAddress = addresses.find((address) => address.id === Number(selectedAddressId));
  const editingAddress = addresses.find((address) => address.id === editingAddressId);
  const deliveryType = deliveryMode === 'gift' ? 'GIFT' : 'SELF';

  const buildCartPreview = (items, shippingFee = null) => {
    const summaryItems = items.map((item) => ({
      bookId: item.bookId,
      title: item.title,
      unitPrice: item.price,
      quantity: item.quantity,
      lineTotal: item.lineTotal || item.price * item.quantity,
    }));
    const subtotal = summaryItems.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
    const hasShipping = typeof shippingFee === 'number';

    return {
      items: summaryItems,
      subtotal,
      shippingFee,
      deliveryType: 'SELF',
      giftWrapFee: 0,
      discountAmount: 0,
      total: subtotal + (hasShipping ? shippingFee : 0),
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
  ) => {
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
    );
    setPreview({
      ...previewData,
      items: mergePreviewItems(previewData.items, fallbackItems),
    });
  };

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      setLoading(true);
      setCheckoutError('');
      return Promise.all([
      addressService.list(),
      cartService.getCart(),
      voucherService.listMine().catch(() => []),
      ]);
    })
      .then(([addrList, cart, voucherList]) => {
        if (!active) return;
        const cartIds = (cart.items || []).map((item) => item.itemId);
        const requestedIds = (searchParams.get('items') || '')
          .split(',')
          .map((id) => Number(id))
          .filter((id) => cartIds.includes(id));
        const itemIds = requestedIds.length > 0 ? requestedIds : cartIds;
        const selectedItems = (cart.items || []).filter((item) => itemIds.includes(item.itemId));
        const requestedAddressId = Number(searchParams.get('address'));
        const requestedAddress = addrList.find((address) => address.id === requestedAddressId);
        const defaultAddress = requestedAddress || addrList.find((address) => address.isDefault) || addrList[0];
        const requestedVoucherId = searchParams.get('voucher');
        const requestedVoucher = (voucherList || []).find((voucher) => String(voucher.id) === String(requestedVoucherId));
        const voucherIdToUse = requestedVoucher?.id || '';

        setAddresses(addrList);
        setCartItemIds(itemIds);
        setSelectedCartItems(selectedItems);
        setVouchers(voucherList || []);
        setSelectedVoucherId(voucherIdToUse);
        setVoucherError('');
        setSelectedAddressId(defaultAddress?.id || '');
        setPreview(buildCartPreview(selectedItems));
        setShowAddAddress(addrList.length === 0);
        setShowAddressList(false);
        setShowVoucherList(false);

        if (defaultAddress?.id && itemIds.length > 0) {
          return refreshPreview(defaultAddress.id, itemIds, selectedItems, voucherIdToUse);
        }
        return null;
      })
      .catch((err) => {
        console.error('Failed to load checkout page:', err);
        if (active) setCheckoutError('Could not load checkout information. Please try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  // Checkout initialization intentionally reruns only when URL selections change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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
    if (!selectedAddressId || cartItemIds.length === 0) return;

    try {
      await refreshPreview(selectedAddressId, cartItemIds, selectedCartItems, selectedVoucherId, mode);
    } catch (err) {
      console.error('Failed to update delivery type:', err);
      setCheckoutError(err.response?.data?.message || 'Could not update the delivery type.');
    }
  };

  const pay = async () => {
    if (!selectedAddressId || cartItemIds.length === 0) return;
    setCheckoutError('');

    try {
      const key = uuidv4();
      const result = await checkoutService.checkout(
        selectedAddressId,
        cartItemIds,
        key,
        selectedVoucherId || undefined,
        deliveryType,
      );

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
    } catch (err) {
      setCheckoutError(err.response?.data?.message || 'Checkout failed. Please try again.');
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

  return (
    <div className="stack" style={{ gap: '24px' }}>
      <div className="checkout-page-header">
        <Link to="/cart" className="checkout-back-cart-link">
          Back to cart
        </Link>
        <h1>Checkout Information</h1>
      </div>
      {checkoutError && <p className="form-message form-message-error">{checkoutError}</p>}

      <section className="checkout-grid">
        <div className="stack">
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
              <small>Gift wrap fee: 10,000 VND</small>
            </button>
          </div>
        </div>
        <div className="panel">
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
        <div className={`panel ${!showAddAddress && addresses.length > 0 ? 'collapsed-panel' : ''}`}>
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
      </div>
      <CheckoutSummary
        preview={preview}
        loading={loading}
        canPay={Boolean(selectedAddressId) && cartItemIds.length > 0}
        disabledReason={!selectedAddressId ? 'Add a delivery address to continue to payment.' : ''}
        onPay={pay}
      />
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
      </section>
    </div>
  );
}
