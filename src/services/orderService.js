import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080/api/v1/orders',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const orderService = {
  // GET /api/v1/orders
  getOrders: async () => {
    const response = await api.get('');
    // Lưu ý: Nếu backend trả về PageResponseDTO (có thuộc tính 'content'), 
    // hãy trả về response.data.content
    return response.data;
  },

  // GET /api/v1/orders/{id}
  getOrderById: async (id) => {
    const response = await api.get(`/${id}`);
    return response.data;
  }
};