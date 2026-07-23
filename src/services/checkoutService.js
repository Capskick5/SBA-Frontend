import { apiClient } from '../api/apiClient';

const payloadFor = (addressId, cartItemIds, userVoucherId, deliveryType, giftWrapId, paymentMethod) => ({
  addressId,
  cartItemIds,
  deliveryType,
  ...(userVoucherId ? { userVoucherId } : {}),
  ...(giftWrapId ? { giftWrapId } : {}),
  ...(paymentMethod ? { paymentMethod } : {}),
});

export const checkoutService = {
  preview(addressId, cartItemIds, userVoucherId, deliveryType = 'SELF', giftWrapId = null) {
    return apiClient.post('/orders/preview', payloadFor(addressId, cartItemIds, userVoucherId, deliveryType, giftWrapId));
  },

  checkout(addressId, cartItemIds, idempotencyKey, userVoucherId, deliveryType = 'SELF', giftWrapId = null, paymentMethod = 'VNPAY') {
    return apiClient.post('/orders', payloadFor(addressId, cartItemIds, userVoucherId, deliveryType, giftWrapId, paymentMethod), {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  },

  previewGuest(payload) {
    return apiClient.post('/orders/guest/preview', payload, { auth: false });
  },

  checkoutGuest(payload, idempotencyKey) {
    if (!idempotencyKey) {
      return Promise.reject(new Error('Thiếu Idempotency-Key cho thanh toán khách.'));
    }
    return apiClient.post('/orders/guest', payload, {
      auth: false,
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  },
};
