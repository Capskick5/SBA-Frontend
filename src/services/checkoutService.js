import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080/api/v1/checkout',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const checkoutService = {
  // Gửi thông tin chọn địa chỉ và các item để lấy preview tính tiền
  preview: async (addressId, cartItemIds) => {
    const response = await api.post('/preview', { addressId, cartItemIds });
    return response.data;
  },

  // Thực hiện checkout
  checkout: async (addressId, cartItemIds, idempotencyKey) => {
    const response = await api.post('',
      { addressId, cartItemIds },
      { headers: { 'Idempotency-Key': idempotencyKey } }
    );
    return response.data;
  }
};