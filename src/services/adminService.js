import axios from 'axios';
import { refreshAccessToken } from './apiClient';
import { tokenStorage } from './tokenStorage';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
});

let refreshPromise = null;

api.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const canRetry = [401, 403].includes(error.response?.status) && originalRequest && !originalRequest._retry;

    if (!canRetry || !tokenStorage.getRefreshToken()) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const newAccessToken = await refreshPromise;
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      tokenStorage.clear();
      return Promise.reject(refreshError);
    }
  }
);

export const adminService = {
  getStats: () => api.get('/statistics/overview').then(res => res.data?.data || res.data),

  getBooks: (params) => api.get('/books', { params }).then(res => res.data),

  getBooksAdmin: (params) => api.get('/books/admin', { params }).then(res => res.data),

  adjustStock: (id, body) => api.post(`/books/${id}/stock-adjustments`, body).then(res => res.data),

  getBookById: (id) => api.get(`/books/${id}`).then(res => res.data),

  getStockMovements: (params) => api.get('/stock-movements', { params }).then(res => res.data),
  getBookStockMovements: (id, params) => api.get(`/books/${id}/stock-movements`, { params }).then(res => res.data),
  getBookChangeLogs: (id, params) => api.get(`/books/${id}/change-logs`, { params }).then(res => res.data?.data || res.data),
  addBook: (bookData) => { return api.post('/books', bookData); },
  updateBook: (id, bookData) => api.put(`/books/${id}`, bookData).then(res => res.data),

  getCategories: () => api.get('/categories').then(res => res.data),
  addCategory: (catData) => api.post('/categories', catData).then(res => res.data),

  getOrders: (params) => api.get('/orders', { params }).then(res => res.data),
  updateOrderStatus: (id, status, shippingProvider, trackingCode) =>
    api.put(`/orders/${id}/status`, { status, shippingProvider, trackingCode }).then(res => res.data),

  getUsers: (params) => api.get('/users', { params }).then(res => res.data),
  toggleUserStatus: (userId, enabled) => api.put(`/users/${userId}/enabled`, { enabled }).then(res => res.data),

  getReviews: (params) => api.get('/admin/reviews', { params }).then(res => res.data?.data?.items || res.data?.data || []),
  deleteReview: (id) => api.delete(`/reviews/${id}`).then(res => res.data),

  getVoucherRules: (params) => api.get('/vouchers', { params }).then(res => res.data?.data || res.data),
  createVoucherRule: (body) => api.post('/vouchers', body).then(res => res.data?.data || res.data),
  disableVoucherRule: (id) => api.delete(`/vouchers/${id}`),

  toggleBookActive: (id, isActive) => {
    return api.put(`/books/${id}/active`, { active: isActive });
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
  },

  checkRagHealth: () => api.get('/admin/rag/health').then(res => res.data),
  ingestBookContent: (bookId, chunkSize, overlapSize) => {
    const params = {};
    if (chunkSize) params.chunkSize = chunkSize;
    if (overlapSize) params.overlapSize = overlapSize;
    return api.post(`/admin/rag/ingest/${bookId}`, null, { params }).then(res => res.data);
  },
  ingestBooksBulk: (bookIds, chunkSize, overlapSize) => {
    const params = {};
    if (chunkSize) params.chunkSize = chunkSize;
    if (overlapSize) params.overlapSize = overlapSize;
    return api.post('/admin/rag/ingest/bulk', bookIds, { params }).then(res => res.data);
  },
  deleteBookIndex: (bookId) => api.delete(`/admin/rag/index/${bookId}`).then(res => res.data),
  deleteBooksIndicesBulk: (bookIds) => api.delete('/admin/rag/index/bulk', { data: bookIds }).then(res => res.data),
  getBookIndexStatus: (bookId) => api.get(`/admin/rag/index/${bookId}/status`).then(res => res.data),
  getBookCatalogStatus: (bookId) => api.get(`/admin/rag/catalog/${bookId}/status`).then(res => res.data),
  upsertBookCatalog: (bookId) => api.post(`/admin/rag/catalog/upsert/${bookId}`).then(res => res.data),
  upsertBooksCatalogBulk: (bookIds) => api.post('/admin/rag/catalog/upsert/bulk', bookIds).then(res => res.data)
};
