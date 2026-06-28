import { apiGet } from './apiClient';

export const paymentService = {
  verifyPayment(params) {
    return apiGet('/payments/vnpay/webhook', params);
  },
};
