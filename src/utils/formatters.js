export const formatCurrency = (value) =>
  `${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(value || 0)} VND`;

export const formatProductPrice = formatCurrency;

export const normalizeText = (value) => String(value || '').trim().toLowerCase();
