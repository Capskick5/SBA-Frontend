import { apiClient } from './apiClient';

const pageQuery = { page: 0, size: 100 };

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

const itemsOf = (page) => page?.items || page?.content || (Array.isArray(page) ? page : []);

async function getUsersPage(params = pageQuery) {
  return apiClient.get(buildPath('/users', params));
}

export const adminService = {
  async getStats() {
    const [booksPage, ordersPage, usersPage] = await Promise.all([
      apiClient.get(buildPath('/books', pageQuery), { auth: false }),
      apiClient.get(buildPath('/orders', pageQuery)),
      getUsersPage(pageQuery),
    ]);
    const orders = itemsOf(ordersPage);

    return {
      totalUsers: usersPage.totalItems || itemsOf(usersPage).length,
      totalBooks: booksPage.totalItems || itemsOf(booksPage).length,
      totalOrders: ordersPage.totalItems || orders.length,
      recognizedRevenue: orders
        .filter((order) => order.status !== 'CANCELLED')
        .reduce((sum, order) => sum + (order.total || 0), 0),
    };
  },

  getBooks(params = pageQuery) {
    return apiClient.get(buildPath('/books', params), { auth: false });
  },

  getBookById(id) {
    return apiClient.get(`/books/${id}`, { auth: false });
  },

  addBook(bookData) {
    return apiClient.post('/books', bookData);
  },

  updateBook(id, bookData) {
    return apiClient.put(`/books/${id}`, bookData);
  },

  toggleBookActive(id, active) {
    return apiClient.put(`/books/${id}/active`, { active });
  },

  async getCategories(params = pageQuery) {
    const page = await apiClient.get(buildPath('/categories', params), { auth: false });
    return itemsOf(page);
  },

  addCategory(categoryData) {
    return apiClient.post('/categories', categoryData);
  },

  getOrders(params = pageQuery) {
    return apiClient.get(buildPath('/orders', params));
  },

  updateOrderStatus(id, status) {
    return apiClient.put(`/orders/${id}/status`, { status });
  },

  async getUsers(params = pageQuery) {
    const page = await getUsersPage(params);
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
