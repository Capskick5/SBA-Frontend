import { mockAddresses } from '../mocks/mockData';
import { addressService } from './addressService';
import { cartService } from './cartService';

export const checkoutService = {
  getAddresses() {
    return addressService.list().catch(() => Promise.resolve(mockAddresses));
  },
  async preview(address = mockAddresses[0]) {
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
