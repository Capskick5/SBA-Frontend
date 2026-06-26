import axios from 'axios';

const API_BASE = 'http://localhost:8080/api/v1/cart';

// Hàm lấy token từ localStorage (hoặc nơi bạn lưu trữ sau khi login)
const getAuthHeaders = () => {
  const token = localStorage.getItem('token'); // Thay 'token' bằng key bạn dùng để lưu JWT
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const cartService = {
  getCart: async () => {
    const response = await axios.get(API_BASE, { headers: getAuthHeaders() });
    return response.data;
  },

  updateQuantity: async (itemId, quantity) => {
    const response = await axios.put(`${API_BASE}/items/${itemId}`, { quantity }, { headers: getAuthHeaders() });
    return response.data;
  },

  removeItem: async (itemId) => {
    const response = await axios.delete(`${API_BASE}/items/${itemId}`, { headers: getAuthHeaders() });
    return response.data;
  }
};