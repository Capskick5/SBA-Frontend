const TOKEN_KEY = 'bookverse:guestToken';
const CART_KEY = 'bookverse:guestCart';

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function getGuestToken() {
  let token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(TOKEN_KEY, token);
  }
  return token;
}

export function getGuestCartItems() {
  const items = readJson(CART_KEY, []);
  return Array.isArray(items) ? items : [];
}

export function setGuestCartItems(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items || []));
}

export function clearGuestCart() {
  localStorage.removeItem(CART_KEY);
}

export function guestItemIdForBook(bookId) {
  return `g-${bookId}`;
}
