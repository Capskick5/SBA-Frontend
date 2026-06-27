import { apiClient } from './apiClient';

const buildPath = (path, params) => {
  if (!params) return path;
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });
  const qs = searchParams.toString();
  return qs ? `${path}?${qs}` : path;
};

export const paymentService = {
  verifyPayment: (params) => apiClient.get(buildPath('/payments/vnpay/webhook', params)),
};