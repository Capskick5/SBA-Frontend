import axios from 'axios';

// Cấu hình axios instance chung cho nhóm Admin
const api = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
});

// Interceptor để luôn gửi kèm token admin
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bookverse_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const adminService = {
  // Hàm tổng hợp thống kê đã được tối ưu
  getStats: async () => {
    try {
      // Truyền size lớn để đếm toàn bộ dữ liệu trong DB
      const [users, books, orders] = await Promise.all([
        adminService.getUsers({ size: 1000 }),
        adminService.getBooks({ size: 1000 }),
        adminService.getOrders({ size: 1000 })
      ]);

      // Bóc vỏ dữ liệu chuẩn xác theo format của Backend
      const usersList = users.data?.items || users.items || [];
      const booksList = books.data?.items || books.items || [];
      const ordersList = orders.data?.items || orders.items || [];

      // Tính tổng doanh thu
      const revenue = ordersList
        .filter(order => order.status !== 'CANCELLED')
        .reduce((sum, order) => sum + (order.total || 0), 0);

      return {
        totalUsers: usersList.length,
        totalBooks: booksList.length,
        totalOrders: ordersList.length,
        recognizedRevenue: revenue
      };
    } catch (error) {
      console.error("Lỗi khi tổng hợp thống kê:", error);
      throw error;
    }
  },

  // Quản lý Sách
  getBooks: (params) => api.get('/books', { params }).then(res => res.data),

  // THÊM DÒNG NÀY: Gọi API lấy chi tiết 1 cuốn sách theo ID
  getBookById: (id) => api.get(`/books/${id}`).then(res => res.data),

  addBook: (bookData) => api.post('/books', bookData).then(res => res.data),
  updateBook: (id, bookData) => api.put(`/books/${id}`, bookData).then(res => res.data),

  // Quản lý Danh mục
  getCategories: () => api.get('/categories').then(res => res.data),
  addCategory: (catData) => api.post('/categories', catData).then(res => res.data),

  // Quản lý Đơn hàng
  getOrders: (params) => api.get('/orders', { params }).then(res => res.data),
  updateOrderStatus: (id, status) => api.put(`/orders/${id}/status`, { status }).then(res => res.data),

  // Quản lý Người dùng
  getUsers: (params) => api.get('/users', { params }).then(res => res.data), // Nhớ thêm { params } ở đây
  toggleUserStatus: (userId, enabled) => api.put(`/users/${userId}/enabled`, { enabled }).then(res => res.data),

  // Quản lý Review
  getReviews: (params) => api.get('/reviews', { params }).then(res => res.data),

  // Ẩn/hiện sách
  toggleBookActive: (id) => api.put(`/books/${id}/active`).then(res => res.data),
};