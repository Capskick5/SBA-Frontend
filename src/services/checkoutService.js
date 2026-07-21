import { apiClient } from '../api/apiClient';

const payloadFor = (addressId, cartItemIds, userVoucherId, deliveryType, paymentMethod) => ({
  addressId,
  cartItemIds,
  deliveryType,
  ...(userVoucherId ? { userVoucherId } : {}),
  ...(paymentMethod ? { paymentMethod } : {}),
});

export const checkoutService = {
  preview(addressId, cartItemIds, userVoucherId, deliveryType = 'SELF') {
    return apiClient.post('/orders/preview', payloadFor(addressId, cartItemIds, userVoucherId, deliveryType));
  },

  checkout(addressId, cartItemIds, idempotencyKey, userVoucherId, deliveryType = 'SELF', paymentMethod = 'VNPAY') {
    return apiClient.post('/orders', payloadFor(addressId, cartItemIds, userVoucherId, deliveryType, paymentMethod), {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  },

  previewGuest(payload) {
    return apiClient.post('/orders/guest/preview', payload, { auth: false });
  },

  checkoutGuest(payload, idempotencyKey) {
    return apiClient.post('/orders/guest', payload, {
      auth: false,
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  },
};
