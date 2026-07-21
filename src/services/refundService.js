const REFUND_STORAGE_KEY = 'bookverse_mock_refunds';

function getStoredRefunds() {
  try {
    const data = localStorage.getItem(REFUND_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to parse mock refunds:', e);
    return [];
  }
}

function saveStoredRefunds(refunds) {
  try {
    localStorage.setItem(REFUND_STORAGE_KEY, JSON.stringify(refunds));
    window.dispatchEvent(new Event('refund_updated'));
  } catch (e) {
    console.error('Failed to save mock refunds:', e);
  }
}

export const refundService = {
  getRefundRequests() {
    return Promise.resolve(getStoredRefunds());
  },

  getRefundByOrderId(orderId) {
    const refunds = getStoredRefunds();
    const found = refunds.find((r) => String(r.orderId) === String(orderId));
    return Promise.resolve(found || null);
  },

  createRefundRequest(orderId, refundData) {
    const refunds = getStoredRefunds();
    const existingIndex = refunds.findIndex((r) => String(r.orderId) === String(orderId));

    const newRefund = {
      id: `REF-${Date.now()}`,
      orderId: String(orderId),
      reason: refundData.reason || 'Other',
      description: refundData.description || '',
      bankName: refundData.bankName || '',
      accountNumber: refundData.accountNumber || '',
      accountOwner: refundData.accountOwner || '',
      items: refundData.items || [],
      refundAmount: refundData.refundAmount || 0,
      proofImages: refundData.proofImages || [],
      status: 'PENDING', // PENDING, APPROVED, REJECTED
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rejectReason: null,
    };

    if (existingIndex >= 0) {
      refunds[existingIndex] = newRefund;
    } else {
      refunds.unshift(newRefund);
    }

    saveStoredRefunds(refunds);
    return Promise.resolve(newRefund);
  },

  approveRefund(requestId) {
    const refunds = getStoredRefunds();
    const item = refunds.find((r) => r.id === requestId);
    if (item) {
      item.status = 'APPROVED';
      item.updatedAt = new Date().toISOString();
      saveStoredRefunds(refunds);
    }
    return Promise.resolve(item);
  },

  rejectRefund(requestId, rejectReason) {
    const refunds = getStoredRefunds();
    const item = refunds.find((r) => r.id === requestId);
    if (item) {
      item.status = 'REJECTED';
      item.rejectReason = rejectReason || 'Does not meet return terms.';
      item.updatedAt = new Date().toISOString();
      saveStoredRefunds(refunds);
    }
    return Promise.resolve(item);
  },
};
