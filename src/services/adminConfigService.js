import { adminService } from './adminService';
import { apiClient } from '../api/apiClient';
import {
  getMockBanners,
  getMockGiftWraps,
  nextMockBannerId,
  nextMockGiftWrapId,
  setMockBanners,
  setMockGiftWraps,
} from '../storage/adminConfigStorage';

let bannersUsingMock = false;
let giftWrapsUsingMock = false;

function sortByDisplayOrder(items) {
  return [...items].sort((a, b) => {
    const orderDiff = Number(a.displayOrder || 0) - Number(b.displayOrder || 0);
    if (orderDiff !== 0) return orderDiff;
    return Number(a.id || 0) - Number(b.id || 0);
  });
}

function sortBanners(banners) {
  return sortByDisplayOrder(banners);
}

function normalizeBannerRecord(banner, { imageUrl } = {}) {
  return {
    ...banner,
    imageUrl: imageUrl || banner.imageUrl || '',
  };
}

function normalizeGiftWrapRecord(giftWrap, { imageUrl } = {}) {
  return {
    ...giftWrap,
    imageUrl: imageUrl || giftWrap.imageUrl || '',
  };
}

export function isBannersMockMode() {
  return bannersUsingMock;
}

export async function listBannersAdmin() {
  try {
    const list = await adminService.getBannersAdmin();
    bannersUsingMock = false;
    return {
      items: Array.isArray(list) ? list : [],
      usingMock: false,
    };
  } catch {
    bannersUsingMock = true;
    return {
      items: sortBanners(getMockBanners()),
      usingMock: true,
    };
  }
}

export async function listActiveBanners() {
  try {
    const list = await apiClient.get('/banners');
    bannersUsingMock = false;
    return sortBanners(Array.isArray(list) ? list : []);
  } catch {
    bannersUsingMock = true;
    return sortBanners(getMockBanners().filter((banner) => banner.active));
  }
}

async function withBannerMockFallback(action, fallback) {
  try {
    const result = await action();
    bannersUsingMock = false;
    return result;
  } catch {
    bannersUsingMock = true;
    return fallback();
  }
}

export async function createBanner(payload, options = {}) {
  return withBannerMockFallback(
    () => adminService.createBanner(payload),
    () => {
      const banners = getMockBanners();
      const created = normalizeBannerRecord({
        id: nextMockBannerId(banners),
        ...payload,
        active: payload.active !== false,
      }, { imageUrl: options.imageUrl || '' });
      setMockBanners(sortBanners([...banners, created]));
      return created;
    },
  );
}

export async function updateBanner(id, payload, options = {}) {
  return withBannerMockFallback(
    () => adminService.updateBanner(id, payload),
    () => {
      const banners = getMockBanners();
      const index = banners.findIndex((banner) => String(banner.id) === String(id));
      if (index < 0) throw new Error('Banner not found.');
      const updated = normalizeBannerRecord({
        ...banners[index],
        ...payload,
        id: banners[index].id,
      }, { imageUrl: options.imageUrl || banners[index].imageUrl });
      const next = [...banners];
      next[index] = updated;
      setMockBanners(sortBanners(next));
      return updated;
    },
  );
}

export async function setBannerActive(id, active) {
  return withBannerMockFallback(
    () => adminService.setBannerActive(id, active),
    () => {
      const banners = getMockBanners();
      const index = banners.findIndex((banner) => String(banner.id) === String(id));
      if (index < 0) throw new Error('Banner not found.');
      const next = [...banners];
      next[index] = { ...next[index], active };
      setMockBanners(next);
      return next[index];
    },
  );
}

export async function deleteBanner(id) {
  return withBannerMockFallback(
    () => adminService.deleteBanner(id),
    () => {
      const banners = getMockBanners().filter((banner) => String(banner.id) !== String(id));
      setMockBanners(banners);
      return null;
    },
  );
}

export function isGiftWrapsMockMode() {
  return giftWrapsUsingMock;
}

export async function listGiftWrapsAdmin() {
  try {
    const list = await adminService.getGiftWrapsAdmin();
    giftWrapsUsingMock = false;
    return {
      items: Array.isArray(list) ? list : [],
      usingMock: false,
    };
  } catch {
    giftWrapsUsingMock = true;
    return {
      items: sortByDisplayOrder(getMockGiftWraps()),
      usingMock: true,
    };
  }
}

export async function listActiveGiftWraps() {
  try {
    const list = await apiClient.get('/gift-wraps', { auth: false });
    giftWrapsUsingMock = false;
    return sortByDisplayOrder(Array.isArray(list) ? list : []);
  } catch {
    giftWrapsUsingMock = true;
    return sortByDisplayOrder(getMockGiftWraps().filter((giftWrap) => giftWrap.active));
  }
}

async function withGiftWrapMockFallback(action, fallback) {
  try {
    const result = await action();
    giftWrapsUsingMock = false;
    return result;
  } catch {
    giftWrapsUsingMock = true;
    return fallback();
  }
}

export async function createGiftWrap(payload, options = {}) {
  return withGiftWrapMockFallback(
    () => adminService.createGiftWrap(payload),
    () => {
      const giftWraps = getMockGiftWraps();
      const created = normalizeGiftWrapRecord({
        id: nextMockGiftWrapId(giftWraps),
        ...payload,
        active: payload.active !== false,
      }, { imageUrl: options.imageUrl || '' });
      setMockGiftWraps(sortByDisplayOrder([...giftWraps, created]));
      return created;
    },
  );
}

export async function updateGiftWrap(id, payload, options = {}) {
  return withGiftWrapMockFallback(
    () => adminService.updateGiftWrap(id, payload),
    () => {
      const giftWraps = getMockGiftWraps();
      const index = giftWraps.findIndex((giftWrap) => String(giftWrap.id) === String(id));
      if (index < 0) throw new Error('Gift wrap not found.');
      const updated = normalizeGiftWrapRecord({
        ...giftWraps[index],
        ...payload,
        id: giftWraps[index].id,
      }, { imageUrl: options.imageUrl || giftWraps[index].imageUrl });
      const next = [...giftWraps];
      next[index] = updated;
      setMockGiftWraps(sortByDisplayOrder(next));
      return updated;
    },
  );
}

export async function setGiftWrapActive(id, active) {
  return withGiftWrapMockFallback(
    () => adminService.setGiftWrapActive(id, active),
    () => {
      const giftWraps = getMockGiftWraps();
      const index = giftWraps.findIndex((giftWrap) => String(giftWrap.id) === String(id));
      if (index < 0) throw new Error('Gift wrap not found.');
      const next = [...giftWraps];
      next[index] = { ...next[index], active };
      setMockGiftWraps(next);
      return next[index];
    },
  );
}

export async function deleteGiftWrap(id) {
  return withGiftWrapMockFallback(
    () => adminService.deleteGiftWrap(id),
    () => {
      const giftWraps = getMockGiftWraps().filter((giftWrap) => String(giftWrap.id) !== String(id));
      setMockGiftWraps(giftWraps);
      return null;
    },
  );
}
