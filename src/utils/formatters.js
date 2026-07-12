export const formatCurrency = (value) =>
  `${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(value || 0)} VND`;

export const formatProductPrice = formatCurrency;

export const normalizeText = (value) => String(value || '').trim().toLowerCase();

const toValidDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatDate = (value, fallback = 'N/A') => {
  const date = toValidDate(value);
  if (!date) return fallback;

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

export const formatDateTime = (value, fallback = 'N/A') => {
  const date = toValidDate(value);
  if (!date) return fallback;

  const time = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);

  return `${formatDate(date, fallback)} ${time}`;
};
