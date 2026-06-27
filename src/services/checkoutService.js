import { apiClient } from './apiClient';

export const checkoutService = {
  preview: (addressId, cartItemIds) => apiClient.post('/orders/preview', { addressId, cartItemIds }),
  checkout: (addressId, cartItemIds, idempotencyKey) => apiClient.post('/orders', 
    { addressId, cartItemIds }, 
    { headers: { 'Idempotency-Key': idempotencyKey } }
  ),
};