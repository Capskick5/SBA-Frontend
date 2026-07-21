import { apiGet } from '../api/apiClient';

export const paymentService = {
  verifyPayment(params) {
    return apiGet('/payments/vnpay/webhook', params);
  },
};
