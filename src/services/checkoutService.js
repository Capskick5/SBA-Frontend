import { mockAddresses } from '../mocks/mockData';
import { cartService } from './cartService';

export const checkoutService = {
  getAddresses() {
    return Promise.resolve(mockAddresses);
  },
  async preview(address = mockAddresses[0]) {
    const cart = await cartService.getSelectedCart();
    const shippingFee = cart.items.length ? 30000 : 0;
    return {
      items: cart.items,
      subtotal: cart.subtotal,
      shippingFee,
      total: cart.subtotal + shippingFee,
      address,
    };
  },
  checkout(paymentMethod = 'PAYOS') {
    return Promise.resolve({
      orderId: 1001,
      paymentId: 501,
      paymentMethod,
      checkoutUrl: '/payment/result?status=pending',
    });
  },
};
