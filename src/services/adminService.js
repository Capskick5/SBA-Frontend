import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bookverse_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const adminService = {
  getStats: async () => {
    try {
      const [users, books, orders] = await Promise.all([
        adminService.getUsers({ size: 1000 }),
        adminService.getBooks({ size: 1000 }),
        adminService.getOrders({ size: 1000 })
      ]);

      const usersList = users.data?.items || users.items || [];
      const booksList = books.data?.items || books.items || [];
      const ordersList = orders.data?.items || orders.items || [];

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
      console.error('Failed to build admin statistics:', error);
      throw error;
    }
  },

  getBooks: (params) => api.get('/books', { params }).then(res => res.data),

  getBookById: (id) => api.get(`/books/${id}`).then(res => res.data),

  addBook: (bookData) => { return api.post('/books', bookData); },
  updateBook: (id, bookData) => api.put(`/books/${id}`, bookData).then(res => res.data),

  getCategories: () => api.get('/categories').then(res => res.data),
  addCategory: (catData) => api.post('/categories', catData).then(res => res.data),

  getOrders: (params) => api.get('/orders', { params }).then(res => res.data),
  updateOrderStatus: (id, status, shippingProvider, trackingCode) =>
    api.put(`/orders/${id}/status`, { status, shippingProvider, trackingCode }).then(res => res.data),

  getUsers: (params) => api.get('/users', { params }).then(res => res.data),
  toggleUserStatus: (userId, enabled) => api.put(`/users/${userId}/enabled`, { enabled }).then(res => res.data),

  getReviews: () => Promise.resolve([]),

  toggleBookActive: (id, isActive) => {
    return api.put(`/books/${id}/active`, null, { params: { active: isActive } });
  },


  uploadThumbnail: (formData) => {
    return api.post('/admin/uploads/thumbnail', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  uploadBookFile: (formData) => {
    return api.post('/admin/uploads/book-file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

  }
};
