const SCROLL_FLAG_KEY = 'bv:scrollCatalogProducts';
export const CATALOG_SCROLL_EVENT = 'catalog:scroll-to-products';

const SNAP_GAP_PX = 10;
const PROGRAMMATIC_LOCK_MS = 850;

let programmaticScrollLock = false;
let programmaticLockTimer = 0;

export function beginProgrammaticCatalogScroll(durationMs = PROGRAMMATIC_LOCK_MS) {
  programmaticScrollLock = true;
  window.clearTimeout(programmaticLockTimer);
  programmaticLockTimer = window.setTimeout(() => {
    programmaticScrollLock = false;
  }, durationMs);
}

export function isProgrammaticCatalogScroll() {
  return programmaticScrollLock;
}

export function requestScrollToCatalogProducts() {
  try {
    sessionStorage.setItem(SCROLL_FLAG_KEY, '1');
  } catch {
    // ignore storage failures
  }
  window.dispatchEvent(new CustomEvent(CATALOG_SCROLL_EVENT));
}

export function consumeScrollToCatalogProductsFlag() {
  try {
    if (sessionStorage.getItem(SCROLL_FLAG_KEY) !== '1') return false;
    sessionStorage.removeItem(SCROLL_FLAG_KEY);
    return true;
  } catch {
    return false;
  }
}

function getNavbarHeight() {
  return document.querySelector('.navbar')?.getBoundingClientRect().height || 132;
}

/** Prefer voucher bar; fall back to product grid. */
export function getCatalogSnapTarget() {
  return (
    document.getElementById('catalog-snap-target') ||
    document.getElementById('catalog-products')
  );
}

export function scrollToCatalogProducts(options = {}) {
  const { behavior = 'smooth', extraOffset = SNAP_GAP_PX } = options;
  const section = getCatalogSnapTarget();
  if (!section) return false;

  beginProgrammaticCatalogScroll();
  const offset = Math.round(getNavbarHeight() + extraOffset);
  const top = section.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top: Math.max(0, top), behavior });
  return true;
}

export function scrollToCatalogTop(options = {}) {
  const { behavior = 'smooth' } = options;
  beginProgrammaticCatalogScroll();
  window.scrollTo({ top: 0, behavior });
}

/** Retry briefly while catalog section mounts / re-renders after nav. */
export function scrollToCatalogProductsWhenReady({ attempts = 12, delayMs = 50 } = {}) {
  const tryScroll = (left) => {
    if (scrollToCatalogProducts()) return;
    if (left <= 0) return;
    window.setTimeout(() => tryScroll(left - 1), delayMs);
  };
  tryScroll(attempts);
}

/**
 * When scroll crosses the vertical midpoint of the hero banner,
 * snap down to voucher/products (under category) or snap back to top.
 */
export function attachHeroBannerMidSnap({ getEnabled } = {}) {
  let pastMid = false;
  let initialized = false;

  const isPastBannerMid = () => {
    const banner = document.querySelector('.hero-banner-slider');
    if (!banner) return false;
    const rect = banner.getBoundingClientRect();
    if (rect.height < 8) return false;
    const midY = rect.top + rect.height / 2;
    return midY <= getNavbarHeight();
  };

  const onScroll = () => {
    if (typeof getEnabled === 'function' && !getEnabled()) return;
    if (isProgrammaticCatalogScroll()) return;

    const nowPast = isPastBannerMid();
    if (!initialized) {
      pastMid = nowPast;
      initialized = true;
      return;
    }
    if (nowPast === pastMid) return;

    pastMid = nowPast;
    if (nowPast) {
      scrollToCatalogProducts();
    } else {
      scrollToCatalogTop();
    }
  };

  pastMid = isPastBannerMid();
  initialized = true;
  window.addEventListener('scroll', onScroll, { passive: true });

  return () => {
    window.removeEventListener('scroll', onScroll);
  };
}
