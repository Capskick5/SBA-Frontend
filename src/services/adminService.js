import { apiClient } from './apiClient';
import { mockAdminStats, mockReviews } from '../mocks/mockData';

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

export const adminService = {
  getStats: () => Promise.resolve(mockAdminStats),

  getBooks: (params) => apiClient.get(buildPath('/books', params)),
  addBook: (bookData) => apiClient.post('/books', bookData),
  updateBook: (id, bookData) => apiClient.put(`/books/${id}`, bookData),

  getCategories: () => apiClient.get('/categories'),
  addCategory: (catData) => apiClient.post('/categories', catData),

  getOrders: (params) => apiClient.get(buildPath('/orders', params)),
  updateOrderStatus: (id, status) => apiClient.put(`/orders/${id}/status`, { status }),

  getUsers: (params) => apiClient.get(buildPath('/users', params)),
  getAllUsers: (params) => apiClient.get(buildPath('/users', params)),
  toggleUserStatus: (userId, enabled) => apiClient.put(`/users/${userId}/enabled`, { enabled }),

  getReviews: () => Promise.resolve(mockReviews),
  deleteReview: (id) => Promise.resolve(),

  ingestBookContent: (bookId) => apiClient.post(`/admin/rag/ingest/${bookId}`),
  upsertBookCatalog: (bookId) => apiClient.post(`/admin/rag/catalog/upsert/${bookId}`),
};