export const formatCurrency = (value) =>
  `${new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(value || 0)} VND`;

export const normalizeText = (value) => String(value || '').trim().toLowerCase();
