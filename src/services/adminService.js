import { apiClient } from './apiClient';

const pageQuery = 'page=0&size=100';
const itemsOf = (page) => page?.items || [];

export const adminService = {
  async getStats() {
    const [booksPage, ordersPage, usersPage] = await Promise.all([
      apiClient.get(`/books?${pageQuery}`, { auth: false }),
      apiClient.get(`/orders?${pageQuery}`),
      apiClient.get(`/users?${pageQuery}`),
    ]);
    const orders = itemsOf(ordersPage);

    return {
      totalUsers: usersPage.totalItems || itemsOf(usersPage).length,
      totalBooks: booksPage.totalItems || itemsOf(booksPage).length,
      totalOrders: ordersPage.totalItems || orders.length,
      recognizedRevenue: orders.reduce((sum, order) => sum + (order.total || 0), 0),
    };
  },

  async getBooks() {
    const page = await apiClient.get(`/books?${pageQuery}`, { auth: false });
    return itemsOf(page);
  },

  getBookById(id) {
    return apiClient.get(`/books/${id}`, { auth: false });
  },

  updateBook(id, bookData) {
    return apiClient.put(`/books/${id}`, bookData);
  },

  async getCategories() {
    const page = await apiClient.get(`/categories?${pageQuery}`, { auth: false });
    return itemsOf(page);
  },

  addCategory(categoryData) {
    return apiClient.post('/categories', categoryData);
  },

  async getOrders() {
    const page = await apiClient.get(`/orders?${pageQuery}`);
    return itemsOf(page);
  },

  updateOrderStatus(id, status) {
    return apiClient.put(`/orders/${id}/status`, { status });
  },

  async getUsers() {
    const page = await apiClient.get(`/users?${pageQuery}`);
    return itemsOf(page);
  },

  toggleUserStatus(userId, enabled) {
    return apiClient.put(`/users/${userId}/enabled`, { enabled });
  },

  getReviews() {
    return Promise.resolve([]);
  },

  deleteReview() {
    return Promise.resolve();
  },
};
