import { apiClient } from './apiClient';

const payloadFor = (addressId, cartItemIds, userVoucherId) => ({
  addressId,
  cartItemIds,
  ...(userVoucherId ? { userVoucherId } : {}),
});

export const checkoutService = {
  preview(addressId, cartItemIds, userVoucherId) {
    return apiClient.post('/orders/preview', payloadFor(addressId, cartItemIds, userVoucherId));
  },

  checkout(addressId, cartItemIds, idempotencyKey, userVoucherId) {
    return apiClient.post('/orders', payloadFor(addressId, cartItemIds, userVoucherId), {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  },
};
