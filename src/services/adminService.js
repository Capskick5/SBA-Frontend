import axios from 'axios';

// Cấu hình axios instance chung cho nhóm Admin
const api = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
});

// Interceptor để luôn gửi kèm token admin
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const adminService = {
  // Thống kê (Bạn cần check xem backend có API trả về stats không, 
  // nếu chưa có bạn có thể tự tổng hợp từ list đơn hàng)
  getStats: () => api.get('/admin/stats').then(res => res.data),

  // Quản lý Sách
  getBooks: (params) => api.get('/books', { params }).then(res => res.data),
  addBook: (bookData) => api.post('/books', bookData).then(res => res.data),
  updateBook: (id, bookData) => api.put(`/books/${id}`, bookData).then(res => res.data),

  // Quản lý Danh mục
  getCategories: () => api.get('/categories').then(res => res.data),
  addCategory: (catData) => api.post('/categories', catData).then(res => res.data),

  // Quản lý Đơn hàng
  getOrders: (params) => api.get('/orders', { params }).then(res => res.data),
  updateOrderStatus: (id, status) => api.put(`/orders/${id}/status`, { status }).then(res => res.data),

  // Quản lý Người dùng
  getUsers: () => api.get('/users').then(res => res.data),
  toggleUserStatus: (userId, enabled) => api.put(`/users/${userId}/enabled`, { enabled }).then(res => res.data),

  // Quản lý Review (Nếu có API tương ứng)
  getReviews: () => api.get('/reviews').then(res => res.data),
};