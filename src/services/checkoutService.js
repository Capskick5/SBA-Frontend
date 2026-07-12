import { apiClient } from './apiClient';

const payloadFor = (addressId, cartItemIds, userVoucherId, deliveryType) => ({
  addressId,
  cartItemIds,
  deliveryType,
  ...(userVoucherId ? { userVoucherId } : {}),
});

export const checkoutService = {
  preview(addressId, cartItemIds, userVoucherId, deliveryType = 'SELF') {
    return apiClient.post('/orders/preview', payloadFor(addressId, cartItemIds, userVoucherId, deliveryType));
  },

  checkout(addressId, cartItemIds, idempotencyKey, userVoucherId, deliveryType = 'SELF') {
    return apiClient.post('/orders', payloadFor(addressId, cartItemIds, userVoucherId, deliveryType), {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  },
};
