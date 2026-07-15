import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingCart, TicketPercent, ArrowRight, ChevronRight, MapPin, Pencil } from 'lucide-react';
import CartItemRow from '../../components/cart/CartItemRow';
import { EmptyState, LoadingState } from '../../components/ui/State';
import { cartService } from '../../services/cartService';
import { addressService } from '../../services/addressService';
import { voucherService } from '../../services/voucherService';
import { notifyCartUpdated } from '../../utils/cartEvents';
import { formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';

const selectDefaultAddress = (addresses = []) =>
  addresses.find((address) => address.isDefault) || null;

const sortCartItemsByTitle = (items = []) =>
  [...items].sort((a, b) => {
    const titleCompare = String(a.title || '').localeCompare(String(b.title || ''), 'en', {
      sensitivity: 'base',
    });
    return titleCompare || Number(a.itemId || 0) - Number(b.itemId || 0);
  });

const normalizeCartOrder = (cart) => ({
  ...cart,
  items: sortCartItemsByTitle(cart?.items || []),
});

function formatVoucherDiscount(voucher) {
  if (!voucher) return '';
  if (voucher.discountType === 'PERCENTAGE') {
    return `${voucher.discountValue}% off`;
  }
  return `${formatCurrency(voucher.discountValue)} off`;
}

export default function CartPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const [cart, setCart] = useState({ items: [], subtotal: 0 });
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [itemErrors, setItemErrors] = useState({});
  const [itemToRemove, setItemToRemove] = useState(null);
  const [loading, setLoading] = useState(true);
  const [defaultAddress, setDefaultAddress] = useState(null);
  const [addressLoading, setAddressLoading] = useState(true);
  const [addresses, setAddresses] = useState([]);
  const [addressPickerOpen, setAddressPickerOpen] = useState(false);
  const [vouchers, setVouchers] = useState([]);
  const [voucherLoading, setVoucherLoading] = useState(true);
  const [selectedVoucherId, setSelectedVoucherId] = useState('');

  const syncCart = (nextCart, options = {}) => {
    const orderedCart = normalizeCartOrder(nextCart);
    setCart(orderedCart);
    notifyCartUpdated(orderedCart);
    setSelectedItemIds((currentIds) => {
      const validIds = (orderedCart.items || []).map((item) => item.itemId);
      if (options.selectAll) return validIds;
      return currentIds.filter((id) => validIds.includes(id));
    });
  };

  useEffect(() => {
    let active = true;
    cartService.getCart()
      .then((data) => { if (active) syncCart(data, { selectAll: true }); })
      .catch((err) => console.error('Failed to load cart:', err))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      setAddressLoading(false);
      return;
    }
    addressService.list()
      .then((list) => {
        setAddresses(list);
        const def = selectDefaultAddress(list);
        setDefaultAddress(def);
        setAddressLoading(false);
      })
      .catch(() => { setAddressLoading(false); });
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) {
      setVoucherLoading(false);
      return;
    }
    voucherService.listMine()
      .then((list) => {
        setVouchers(list || []);
        setSelectedVoucherId('');
      })
      .catch(() => setVouchers([]))
      .finally(() => setVoucherLoading(false));
  }, [isLoggedIn]);

  if (loading) return <LoadingState text="Loading cart..." />;
  if (!cart.items || cart.items.length === 0) {
    return (
      <div className="cart-page">
        <div className="cart-empty-wrap">
          <EmptyState text="Your cart is empty." />
          <button className="btn" onClick={() => navigate('/')}>Continue Shopping</button>
        </div>
      </div>
    );
  }

  const selectedItems = cart.items.filter((item) => selectedItemIds.includes(item.itemId));
  const selectedTotal = selectedItems.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
  const allSelected = selectedItemIds.length === cart.items.length && cart.items.length > 0;
  const finalTotal = selectedTotal;
  const selectedVoucher = vouchers.find((voucher) => String(voucher.id) === String(selectedVoucherId));

  const toggleItem = (itemId) => {
    setSelectedItemIds((currentIds) =>
      currentIds.includes(itemId)
        ? currentIds.filter((id) => id !== itemId)
        : [...currentIds, itemId]
    );
  };

  const toggleAll = () => {
    setSelectedItemIds(allSelected ? [] : cart.items.map((item) => item.itemId));
  };

  const clearItemError = (itemId) => {
    setItemErrors((current) => { const next = { ...current }; delete next[itemId]; return next; });
  };

  const setItemError = (itemId, message) => {
    setItemErrors((current) => ({ ...current, [itemId]: message }));
  };

  const handleQuantityChange = (item, quantity) => {
    clearItemError(item.itemId);
    cartService.updateQuantity(item.itemId, item.bookId, quantity)
      .then((nextCart) => { syncCart(nextCart); clearItemError(item.itemId); })
      .catch(() => {
        const message = quantity > item.quantity
          ? 'Maximum available stock reached for this book.'
          : 'Could not update quantity. Please try again.';
        setItemError(item.itemId, message);
      });
  };

  const requestRemove = (itemId) => {
    const item = cart.items.find((i) => i.itemId === itemId);
    if (item) setItemToRemove(item);
  };

  const confirmRemove = () => {
    if (!itemToRemove) return;
    const itemId = itemToRemove.itemId;
    clearItemError(itemId);
    setItemToRemove(null);
    cartService.removeItem(itemId)
      .then((nextCart) => { syncCart(nextCart); clearItemError(itemId); })
      .catch(() => setItemError(itemId, 'Could not remove this item. Please try again.'));
  };

  const goToCheckout = () => {
    if (selectedItemIds.length === 0) return;
    const params = new URLSearchParams({ items: selectedItemIds.join(',') });
    if (defaultAddress?.id) params.set('address', String(defaultAddress.id));
    if (selectedVoucherId) params.set('voucher', String(selectedVoucherId));
    navigate(`/checkout?${params.toString()}`);
  };

  const handleSelectAddress = (address) => {
    setDefaultAddress(address);
    setAddressPickerOpen(false);
  };

  return (
    <div className="cart-page">
      <h1 className="cart-page-title">
        <ShoppingCart size={26} />
        Shopping Cart
      </h1>

      <div className="cart-layout">
        {/* ── Left: Items ─────────────────────── */}
        <div className="cart-items-panel">
          {/* Column header */}
          <div className="cart-col-header">
            <div className="cart-col-check">
              <input
                type="checkbox"
                className="cart-checkbox"
                checked={allSelected}
                onChange={toggleAll}
                aria-label="Select all items"
                id="cart-select-all"
              />
              <label htmlFor="cart-select-all" className="cart-select-all-label">
                All ({cart.items.length} items)
              </label>
            </div>
            <span className="cart-col-label cart-col-price">Unit Price</span>
            <span className="cart-col-label cart-col-qty">Quantity</span>
            <span className="cart-col-label cart-col-total">Subtotal</span>
            <span className="cart-col-label cart-col-del"></span>
          </div>

          {/* Items */}
          <div className="cart-items-list">
            {cart.items.map((item) => (
              <CartItemRow
                key={item.itemId}
                item={item}
                selected={selectedItemIds.includes(item.itemId)}
                error={itemErrors[item.itemId]}
                onSelect={() => toggleItem(item.itemId)}
                onQuantity={(_, quantity) => handleQuantityChange(item, quantity)}
                onRemove={requestRemove}
              />
            ))}
          </div>
        </div>

        {/* ── Right: Summary ──────────────────── */}
        <aside className="cart-summary-panel">
          {/* Delivery Address */}
          <div className="cart-summary-section">
            <div className="cart-summary-section-title">
              <MapPin size={16} />
              Delivery Address
              {isLoggedIn && (
                <button
                  type="button"
                  className="cart-address-change-link"
                  onClick={() => setAddressPickerOpen(true)}
                  disabled={addressLoading || addresses.length === 0}
                >
                  <Pencil size={12} />
                  Change
                </button>
              )}
            </div>
            {addressLoading ? (
              <div className="cart-address-empty">Loading address...</div>
            ) : !isLoggedIn ? (
              <div className="cart-address-empty">
                You will enter delivery address at checkout
              </div>
            ) : defaultAddress ? (
              <div className="cart-address-box">
                <div className="cart-address-name-row">
                  <span className="cart-address-name">{defaultAddress.recipient}</span>
                  <span className="cart-address-phone">{defaultAddress.phone}</span>
                </div>
                <p className="cart-address-detail">
                  {[defaultAddress.line, defaultAddress.ward, defaultAddress.district, defaultAddress.city]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              </div>
            ) : (
              <Link to="/profile/addresses?redirect=/cart" className="cart-address-empty">
                + Add a delivery address
              </Link>
            )}
          </div>
          <div className="cart-summary-divider" />

          {/* Voucher */}
          {isLoggedIn && (
            <div className="cart-summary-section">
              <div className="cart-summary-section-title">
                <TicketPercent size={16} />
                Voucher
              </div>
              {voucherLoading ? (
                <div className="cart-address-empty">Loading vouchers...</div>
              ) : vouchers.length > 0 ? (
                <div className="cart-voucher-box">
                  <select
                    className="cart-voucher-select"
                    value={selectedVoucherId}
                    onChange={(event) => setSelectedVoucherId(event.target.value)}
                  >
                    <option value="">No voucher selected</option>
                    {vouchers.map((voucher) => (
                      <option key={voucher.id} value={voucher.id}>
                        {voucher.code} - {formatVoucherDiscount(voucher)}
                      </option>
                    ))}
                  </select>
                  {selectedVoucher ? (
                    <p>
                      {selectedVoucher.code} will be checked again at checkout.
                    </p>
                  ) : (
                    <p>Select a voucher now, then confirm the discount at checkout.</p>
                  )}
                </div>
              ) : (
                <Link to="/profile?tab=vouchers" className="cart-address-empty">
                  No voucher available. View voucher wallet
                </Link>
              )}
            </div>
          )}

          {/* Price breakdown */}
          <div className="cart-summary-section">
            <div className="cart-summary-row">
              <span>Merchandise Total</span>
              <span>{formatCurrency(selectedTotal)}</span>
            </div>
            {selectedVoucher && (
              <div className="cart-summary-row cart-summary-discount">
                <span>Selected voucher</span>
                <span>{selectedVoucher.code}</span>
              </div>
            )}
            <div className="cart-summary-divider" />
            <div className="cart-summary-row cart-summary-total">
              <span>Order Total</span>
              <span className="cart-total-amount">{formatCurrency(finalTotal)}</span>
            </div>
            {selectedVoucher && (
              <p className="cart-summary-savings">
                Final discount will be calculated on the checkout page.
              </p>
            )}
          </div>

          {/* Checkout CTA */}
          <button
            type="button"
            className="btn cart-checkout-btn"
            onClick={goToCheckout}
            disabled={selectedItemIds.length === 0}
          >
            Checkout ({selectedItemIds.length})
            <ArrowRight size={18} />
          </button>

          <button
            type="button"
            className="cart-continue-btn"
            onClick={() => navigate('/')}
          >
            <ChevronRight size={14} />
            Continue Shopping
          </button>
        </aside>
      </div>

      {/* Remove confirmation modal */}
      {itemToRemove && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={(e) => e.target === e.currentTarget && setItemToRemove(null)}
        >
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="remove-cart-title">
            <div className="modal-header">
              <h2 id="remove-cart-title">Remove item?</h2>
              <button type="button" className="modal-close" onClick={() => setItemToRemove(null)} aria-label="Close">✕</button>
            </div>
            <p className="cart-modal-book-title">{itemToRemove.title}</p>
            <p className="muted">Are you sure you want to remove this book from your cart?</p>
            <div className="cart-modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setItemToRemove(null)}>Cancel</button>
              <button type="button" className="btn cart-modal-remove-btn" onClick={confirmRemove}>Remove</button>
            </div>
          </div>
        </div>
      )}

      {addressPickerOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={(e) => e.target === e.currentTarget && setAddressPickerOpen(false)}
        >
          <div className="modal cart-address-picker-modal" role="dialog" aria-modal="true" aria-labelledby="cart-address-picker-title">
            <div className="modal-header">
              <h2 id="cart-address-picker-title">Select delivery address</h2>
              <button type="button" className="modal-close" onClick={() => setAddressPickerOpen(false)} aria-label="Close">x</button>
            </div>

            <div className="cart-address-picker-list">
              {addresses.map((address) => {
                const isSelected = defaultAddress?.id === address.id;
                return (
                  <button
                    type="button"
                    key={address.id}
                    className={`cart-address-picker-option${isSelected ? ' is-selected' : ''}`}
                    onClick={() => handleSelectAddress(address)}
                  >
                    <span className="cart-address-picker-radio" aria-hidden="true" />
                    <span className="cart-address-picker-content">
                      <span className="cart-address-picker-name-row">
                        <strong>{address.recipient}</strong>
                        <span>{address.phone}</span>
                      </span>
                      <span>
                        {[address.line, address.ward, address.district, address.city]
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <button type="button" className="cart-address-manage-btn" onClick={() => navigate('/profile/addresses?redirect=/cart')}>
              Manage addresses
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
