import { apiClient } from '../api/apiClient';

export const refundService = {
  async createRefundRequest(orderId, refundData) {
    const result = await apiClient.post(`/orders/${orderId}/refund-requests`, {
      items: refundData.items,
      reason: refundData.reason,
      description: refundData.description || '',
      bankName: refundData.bankName,
      bankAccountNumber: refundData.accountNumber,
      bankAccountHolder: refundData.accountOwner,
      changeOfMindAcknowledged: refundData.changeOfMindAcknowledged || undefined,
    });
    window.dispatchEvent(new Event('refund_updated'));
    return result;
  },

  getRefundByOrderId(orderId) {
    return apiClient.get(`/orders/${orderId}/refund-requests/me`);
  },

  async uploadEvidenceFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/refund-requests/evidence/upload', formData);
  },

  async submitEvidence(orderId, refundRequestId, { url }) {
    const result = await apiClient.put(`/orders/${orderId}/refund-requests/${refundRequestId}/evidence`, {
      url,
    });
    window.dispatchEvent(new Event('refund_updated'));
    return result;
  },

  async submitReturnShipment(orderId, refundRequestId, { shippingProvider, trackingCode }) {
    const result = await apiClient.put(`/orders/${orderId}/refund-requests/${refundRequestId}/return-shipment`, {
      shippingProvider,
      trackingCode,
    });
    window.dispatchEvent(new Event('refund_updated'));
    return result;
  },

  getRefundRequests(params) {
    const queryParams = { ...params };
    if (Array.isArray(queryParams.statuses)) {
      queryParams.statuses = queryParams.statuses.join(',');
    }
    return apiClient.get('/admin/refund-requests', { params: queryParams }).then(res => res?.items || res?.content || res?.data?.items || res?.data || res);
  },
};
