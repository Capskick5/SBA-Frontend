const ORDER_STATUSES = [
  'PENDING_PAYMENT',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
];

const REVENUE_STATUSES = new Set(['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED']);

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseCreatedAt(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getOrderStatuses() {
  return [...ORDER_STATUSES];
}

/**
 * Build a continuous daily series for the last `days` days from a sample of orders.
 */
export function buildDailySeries(orders = [], days = 30) {
  const today = startOfDay(new Date());
  const seriesMap = new Map();

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - offset);
    const key = toDateKey(day);
    seriesMap.set(key, {
      date: key,
      label: `${day.getDate()}/${day.getMonth() + 1}`,
      revenue: 0,
      orderCount: 0,
    });
  }

  const windowStart = new Date(today);
  windowStart.setDate(today.getDate() - (days - 1));

  (orders || []).forEach((order) => {
    const createdAt = parseCreatedAt(order.createdAt);
    if (!createdAt || createdAt < windowStart) return;

    const key = toDateKey(startOfDay(createdAt));
    const bucket = seriesMap.get(key);
    if (!bucket) return;

    bucket.orderCount += 1;
    if (REVENUE_STATUSES.has(order.status)) {
      bucket.revenue += Number(order.total || 0);
    }
  });

  return Array.from(seriesMap.values());
}

export function filterLowStockBooks(books = [], threshold = 5) {
  return (books || [])
    .filter((book) => Number(book.stock) <= threshold)
    .sort((a, b) => Number(a.stock) - Number(b.stock));
}

export function countLowStock(books = [], threshold = 5) {
  return filterLowStockBooks(books, threshold).length;
}

export function countNewCustomers(users = [], days = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);

  return (users || []).filter((user) => {
    if (user.role && user.role !== 'CUSTOMER') return false;
    const createdAt = parseCreatedAt(user.createdAt);
    return createdAt && createdAt >= cutoff;
  }).length;
}

export function sumBooksSold(topSellingBooks = []) {
  return (topSellingBooks || []).reduce(
    (sum, book) => sum + Number(book.soldCount || 0),
    0,
  );
}

export function sumBooksSoldFromCatalog(books = []) {
  return (books || []).reduce(
    (sum, book) => sum + Number(book.soldCount || 0),
    0,
  );
}

export function extractPagedItems(response) {
  const body = response?.data || response;
  if (body?.data?.items && Array.isArray(body.data.items)) {
    return {
      items: body.data.items,
      totalItems: body.data.totalItems ?? body.data.totalElements ?? body.data.items.length,
      totalPages: body.data.totalPages || 1,
    };
  }
  if (body?.items && Array.isArray(body.items)) {
    return {
      items: body.items,
      totalItems: body.totalItems ?? body.totalElements ?? body.items.length,
      totalPages: body.totalPages || 1,
    };
  }
  if (Array.isArray(body)) {
    return { items: body, totalItems: body.length, totalPages: 1 };
  }
  return { items: [], totalItems: 0, totalPages: 0 };
}

export function extractRagHealth(response) {
  const body = response?.data || response || {};
  return {
    status: body.status || 'unknown',
    qdrant: body.qdrant,
    mongo: body.mongo,
    minio: body.minio,
  };
}
