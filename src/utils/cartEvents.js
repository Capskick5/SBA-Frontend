export const CART_UPDATED_EVENT = 'bookverse:cart-updated';

export function getCartItemCount(cart) {
  return (cart?.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
}

export function notifyCartUpdated(cart) {
  window.dispatchEvent(
    new CustomEvent(CART_UPDATED_EVENT, {
      detail: { count: getCartItemCount(cart) },
    })
  );
}
