const GIFT_WRAP_FEE_KEY = 'bookverse:giftWrapFeeVnd';
const MOCK_BANNERS_KEY = 'bookverse:mockBanners';

export const DEFAULT_GIFT_WRAP_FEE_VND = 10000;

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function getGiftWrapFeeVnd() {
  const raw = localStorage.getItem(GIFT_WRAP_FEE_KEY);
  const amount = Number(raw);
  return Number.isFinite(amount) && amount >= 0 ? amount : DEFAULT_GIFT_WRAP_FEE_VND;
}

export function setGiftWrapFeeVnd(amount) {
  const normalized = Math.max(0, Math.round(Number(amount) || 0));
  localStorage.setItem(GIFT_WRAP_FEE_KEY, String(normalized));
  return normalized;
}

export function getMockBanners() {
  const items = readJson(MOCK_BANNERS_KEY, []);
  return Array.isArray(items) ? items : [];
}

export function setMockBanners(banners) {
  localStorage.setItem(MOCK_BANNERS_KEY, JSON.stringify(banners || []));
}

export function nextMockBannerId(banners) {
  const numericIds = (banners || [])
    .map((banner) => Number(banner.id))
    .filter((id) => Number.isFinite(id));
  const maxId = numericIds.length ? Math.max(...numericIds) : 0;
  return maxId + 1;
}
