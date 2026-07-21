import { adminService } from './adminService';
import { apiClient } from '../api/apiClient';
import {
  DEFAULT_GIFT_WRAP_FEE_VND,
  getGiftWrapFeeVnd,
  getMockBanners,
  nextMockBannerId,
  setGiftWrapFeeVnd,
  setMockBanners,
} from '../storage/adminConfigStorage';

let bannersUsingMock = false;

function sortBanners(banners) {
  return [...banners].sort((a, b) => {
    const orderDiff = Number(a.displayOrder || 0) - Number(b.displayOrder || 0);
    if (orderDiff !== 0) return orderDiff;
    return Number(a.id || 0) - Number(b.id || 0);
  });
}

function normalizeBannerRecord(banner, { imageUrl } = {}) {
  return {
    ...banner,
    imageUrl: imageUrl || banner.imageUrl || '',
  };
}

export function getGiftWrapFee() {
  return getGiftWrapFeeVnd();
}

export function setGiftWrapFee(amount) {
  return setGiftWrapFeeVnd(amount);
}

export function isGiftWrapFeeMockMode() {
  return true;
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

export { DEFAULT_GIFT_WRAP_FEE_VND };
