import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import AddressForm from '../../components/checkout/AddressForm';
import CheckoutSummary from '../../components/checkout/CheckoutSummary';
import { AuthFormMessage } from '../../components/auth/AuthFormFooter';
import Button from '../../components/ui/Button';
import { captureFormError } from '../../utils/formErrorUtils';
import { addressService } from '../../services/addressService';
import { cartService } from '../../services/cartService';
import { checkoutService } from '../../services/checkoutService';

const GIFT_WRAP_FEE = 10000;

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [cartItemIds, setCartItemIds] = useState([]);
  const [selectedCartItems, setSelectedCartItems] = useState([]);
  const [preview, setPreview] = useState({ items: [], subtotal: 0, shippingFee: null, total: 0 });
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
  const [addressToDelete, setAddressToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const selectedAddress = addresses.find((address) => address.id === Number(selectedAddressId));
  const editingAddress = addresses.find((address) => address.id === editingAddressId);
  const giftWrapFee = deliveryMode === 'gift' ? GIFT_WRAP_FEE : 0;

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

  const refreshPreview = async (addressId, itemIds, fallbackItems = selectedCartItems) => {
    if (!addressId || itemIds.length === 0) {
      setPreview(buildCartPreview(fallbackItems));
      return;
    }
    const previewData = await checkoutService.preview(addressId, itemIds);
    setPreview({
      ...previewData,
      items: mergePreviewItems(previewData.items, fallbackItems),
    });
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setCheckoutError('');

    Promise.all([addressService.list(), cartService.getCart()])
      .then(([addrList, cart]) => {
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

        setAddresses(addrList);
        setCartItemIds(itemIds);
        setSelectedCartItems(selectedItems);
        setSelectedAddressId(defaultAddress?.id || '');
        setPreview(buildCartPreview(selectedItems));
        setShowAddAddress(addrList.length === 0);
        setShowAddressList(false);

        if (defaultAddress?.id && itemIds.length > 0) {
          return refreshPreview(defaultAddress.id, itemIds, selectedItems);
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
  }, [searchParams]);

  const handleAddressChange = async (event) => {
    const addressId = Number(event.target.value);
    if (!addressId) return;
    setSelectedAddressId(addressId);
    try {
      await refreshPreview(addressId, cartItemIds);
      setCheckoutError('');
    } catch (err) {
      console.error('Failed to load checkout preview:', err);
      setCheckoutError('Could not calculate shipping fee for this address.');
    }
  };

  const handleSelectAddress = async (addressId) => {
    setSelectedAddressId(addressId);
    try {
      await refreshPreview(addressId, cartItemIds);
      setCheckoutError('');
    } catch (err) {
      console.error('Failed to load checkout preview:', err);
      setCheckoutError('Could not calculate shipping fee for this address.');
    }
  };

  const pay = async () => {
    if (!selectedAddressId || cartItemIds.length === 0) return;
    setCheckoutError('');

    try {
      const key = uuidv4();
      const result = await checkoutService.checkout(selectedAddressId, cartItemIds, key);

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

  return (
    <section className="checkout-grid">
      <div className="stack">
        <h1>Checkout Information</h1>
        {checkoutError && <p className="form-message form-message-error">{checkoutError}</p>}
        <div className="panel checkout-delivery-mode">
          <h3>Delivery type</h3>
          <div className="delivery-mode-options" role="group" aria-label="Delivery type">
            <button
              type="button"
              className={deliveryMode === 'self' ? 'is-active' : ''}
              onClick={() => setDeliveryMode('self')}
            >
              <strong>For myself</strong>
              <span>Ship this order to me.</span>
            </button>
            <button
              type="button"
              className={deliveryMode === 'gift' ? 'is-active' : ''}
              onClick={() => setDeliveryMode('gift')}
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
                ? 'Use a saved address for this order, or change it if needed.'
                : 'You do not have any saved address yet. Add a delivery address below.'}
            </p>
          </div>
          {addresses.length > 0 ? (
            <>
              <select className="address-select" value={selectedAddressId} onChange={handleAddressChange}>
                {addresses.map((address) => (
                  <option key={address.id} value={address.id}>
                    {address.recipient} - {address.line}, {address.city}
                  </option>
                ))}
              </select>
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
                      onClick={() => startEditingAddress(selectedAddress.id)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      className="btn-secondary danger-action"
                      onClick={() => requestDeleteAddress(selectedAddress)}
                    >
                      Delete
                    </Button>
                  </div>
                </article>
              )}
              <div className="address-panel-actions">
                <Button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowAddressList((open) => !open)}
                >
                  {showAddressList ? 'Hide saved addresses' : `Change address (${addresses.length})`}
                </Button>
              </div>
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
        giftWrapFee={giftWrapFee}
        giftFeeSupported={false}
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
  );
}
