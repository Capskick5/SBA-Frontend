import axios from 'axios';
import { refreshAccessToken } from '../api/apiClient';
import { tokenStorage } from '../storage/tokenStorage';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

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

  getBannersAdmin: () => api.get('/banners/admin').then(res => res.data?.data || res.data),
  createBanner: (bannerData) => api.post('/banners', bannerData).then(res => res.data?.data || res.data),
  updateBanner: (id, bannerData) => api.put(`/banners/${id}`, bannerData).then(res => res.data?.data || res.data),
  setBannerActive: (id, active) => api.put(`/banners/${id}/active`, { active }).then(res => res.data?.data || res.data),
  deleteBanner: (id) => api.delete(`/banners/${id}`).then(res => res.data?.data || res.data),

  getGiftWrapsAdmin: () => api.get('/gift-wraps/admin').then(res => res.data?.data || res.data),
  createGiftWrap: (giftWrapData) => api.post('/gift-wraps', giftWrapData).then(res => res.data?.data || res.data),
  updateGiftWrap: (id, giftWrapData) => api.put(`/gift-wraps/${id}`, giftWrapData).then(res => res.data?.data || res.data),
  setGiftWrapActive: (id, active) => api.put(`/gift-wraps/${id}/active`, { active }).then(res => res.data?.data || res.data),
  deleteGiftWrap: (id) => api.delete(`/gift-wraps/${id}`).then(res => res.data?.data || res.data),

  getOrders: (params) => api.get('/orders', { params }).then(res => res.data?.data || res.data),
  updateOrderStatus: (id, status, shippingProvider, trackingCode) =>
    api.put(`/orders/${id}/status`, { status, shippingProvider, trackingCode }).then(res => res.data),

  getUsers: (params) => api.get('/users', { params }).then(res => res.data),
  toggleUserStatus: (userId, enabled) => api.put(`/users/${userId}/enabled`, { enabled }).then(res => res.data),

  getReviews: (params) => api.get('/admin/reviews', { params }).then(res => res.data?.data || res.data),
  moderateReview: (id, body) => api.put(`/admin/reviews/${id}/moderation`, body).then(res => res.data?.data || res.data),
  getReviewModerationHistory: (id, params) => api.get(`/admin/reviews/${id}/moderation-history`, { params }).then(res => res.data?.data || res.data),
  deleteReview: (id) => api.delete(`/reviews/${id}`).then(res => res.data),

  // Campaigns (admin) — group promotions such as flash sales / welcome gifts
  getCampaigns: (params) => api.get('/admin/campaigns', { params }).then(res => res.data?.data || res.data),
  createCampaign: (body) => api.post('/admin/campaigns', body).then(res => res.data?.data || res.data),
  updateCampaign: (id, body) => api.put(`/admin/campaigns/${id}`, body).then(res => res.data?.data || res.data),
  deleteCampaign: (id) => api.delete(`/admin/campaigns/${id}`),

  // Voucher templates (admin) — the redeemable coupons customers can claim
  getVouchers: (params) => api.get('/admin/vouchers', { params }).then(res => res.data?.data || res.data),
  createVoucher: (body) => api.post('/admin/vouchers', body).then(res => res.data?.data || res.data),
  updateVoucher: (id, body) => api.put(`/admin/vouchers/${id}`, body).then(res => res.data?.data || res.data),
  deleteVoucher: (id) => api.delete(`/admin/vouchers/${id}`),

  getRefundRequests: ({ status, statuses, ...rest } = {}) => {
    const params = { ...rest };
    if (status) params.status = status;
    if (statuses?.length) params.statuses = statuses.join(',');
    return api.get('/admin/refund-requests', { params }).then(res => res.data?.data || res.data);
  },
  approveRefundRequest: (id, body) => api.put(`/admin/refund-requests/${id}/approve`, body).then((res) => {
    window.dispatchEvent(new Event('refund_updated'));
    return res.data?.data || res.data;
  }),
  rejectRefundRequest: (id, body) => api.put(`/admin/refund-requests/${id}/reject`, body).then((res) => {
    window.dispatchEvent(new Event('refund_updated'));
    return res.data?.data || res.data;
  }),
  confirmRefundReceived: (id) => api.put(`/admin/refund-requests/${id}/confirm-received`).then((res) => {
    window.dispatchEvent(new Event('refund_updated'));
    return res.data?.data || res.data;
  }),
  startRefundInspection: (id) => api.put(`/admin/refund-requests/${id}/start-inspection`).then((res) => {
    window.dispatchEvent(new Event('refund_updated'));
    return res.data?.data || res.data;
  }),
  completeRefundInspection: (id, body) => api.put(`/admin/refund-requests/${id}/complete-inspection`, body).then((res) => {
    window.dispatchEvent(new Event('refund_updated'));
    return res.data?.data || res.data;
  }),
  submitReplacementShipment: (id, body) => api.put(`/admin/refund-requests/${id}/replacement-shipment`, body).then((res) => {
    window.dispatchEvent(new Event('refund_updated'));
    return res.data?.data || res.data;
  }),
  markRefundProcessed: (id) => api.put(`/admin/refund-requests/${id}/mark-refund-processed`).then((res) => {
    window.dispatchEvent(new Event('refund_updated'));
    return res.data?.data || res.data;
  }),
  closeRefundRequest: (id) => api.put(`/admin/refund-requests/${id}/close`).then((res) => {
    window.dispatchEvent(new Event('refund_updated'));
    return res.data?.data || res.data;
  }),

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
