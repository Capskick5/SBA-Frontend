const MOCK_BANNERS_KEY = 'bookverse:mockBanners';
const MOCK_GIFT_WRAPS_KEY = 'bookverse:mockGiftWraps';

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function nextMockId(items) {
  const numericIds = (items || [])
    .map((item) => Number(item.id))
    .filter((id) => Number.isFinite(id));
  const maxId = numericIds.length ? Math.max(...numericIds) : 0;
  return maxId + 1;
}

export function getMockBanners() {
  const items = readJson(MOCK_BANNERS_KEY, []);
  return Array.isArray(items) ? items : [];
}

export function setMockBanners(banners) {
  localStorage.setItem(MOCK_BANNERS_KEY, JSON.stringify(banners || []));
}

export function nextMockBannerId(banners) {
  return nextMockId(banners);
}

export function getMockGiftWraps() {
  const items = readJson(MOCK_GIFT_WRAPS_KEY, []);
  return Array.isArray(items) ? items : [];
}

export function setMockGiftWraps(giftWraps) {
  localStorage.setItem(MOCK_GIFT_WRAPS_KEY, JSON.stringify(giftWraps || []));
}

export function nextMockGiftWrapId(giftWraps) {
  return nextMockId(giftWraps);
}
