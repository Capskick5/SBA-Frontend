import { apiClient } from './apiClient';

const payloadFor = (addressId, cartItemIds) => ({
  addressId,
  cartItemIds,
});

export const checkoutService = {
  preview(addressId, cartItemIds) {
    return apiClient.post('/orders/preview', payloadFor(addressId, cartItemIds));
  },

  checkout(addressId, cartItemIds, idempotencyKey) {
    return apiClient.post('/orders', payloadFor(addressId, cartItemIds), {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  },
};
