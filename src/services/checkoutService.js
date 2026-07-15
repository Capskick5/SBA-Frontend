import { apiClient } from './apiClient';
import { getGuestToken } from './guestCartStorage';

const payloadFor = (addressId, cartItemIds, userVoucherId, deliveryType) => ({
  addressId,
  cartItemIds,
  deliveryType,
  ...(userVoucherId ? { userVoucherId } : {}),
});

const guestPayloadFor = (address, cartItemIds, deliveryType) => ({
  cartItemIds,
  deliveryType,
  address: {
    recipient: address.recipient,
    phone: address.phone,
    line: address.line,
    ward: address.ward || '',
    district: address.district || '',
    city: address.city,
  },
});

function guestHeaders(extra = {}) {
  return {
    'X-Guest-Token': getGuestToken(),
    ...extra,
  };
}

export const checkoutService = {
  preview(addressId, cartItemIds, userVoucherId, deliveryType = 'SELF') {
    return apiClient.post('/orders/preview', payloadFor(addressId, cartItemIds, userVoucherId, deliveryType));
  },

  checkout(addressId, cartItemIds, idempotencyKey, userVoucherId, deliveryType = 'SELF') {
    return apiClient.post('/orders', payloadFor(addressId, cartItemIds, userVoucherId, deliveryType), {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  },

  guestPreview(address, cartItemIds, deliveryType = 'SELF') {
    return apiClient.post(
      '/guest/orders/preview',
      guestPayloadFor(address, cartItemIds, deliveryType),
      { auth: false, headers: guestHeaders() },
    );
  },

  guestCheckout(address, cartItemIds, idempotencyKey, deliveryType = 'SELF') {
    return apiClient.post(
      '/guest/orders',
      guestPayloadFor(address, cartItemIds, deliveryType),
      {
        auth: false,
        headers: guestHeaders({ 'Idempotency-Key': idempotencyKey }),
      },
    );
  },
};
