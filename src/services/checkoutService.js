import { cartService } from './cartService';
import { addressService } from './addressService';

export const checkoutService = {
  getAddresses() {
    return addressService.list();
  },
  async preview(address) {
    const cart = await cartService.getCart();
    const shippingFee = cart.items.length ? 30000 : 0;
    return {
      items: cart.items,
      subtotal: cart.subtotal,
      shippingFee,
      total: cart.subtotal + shippingFee,
      address,
    };
  },
  checkout() {
    return Promise.resolve({
      orderId: 1001,
      paymentId: 501,
      checkoutUrl: '/payment/result?status=pending',
    });
  },
};
