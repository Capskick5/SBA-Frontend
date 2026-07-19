import { apiClient } from '../api/apiClient';
import {
  clearGuestCart,
  getGuestCartItems,
  getGuestToken,
  guestItemIdForBook,
  setGuestCartItems,
} from '../storage/guestCartStorage';

const fallbackCover = (title) =>
  `https://placehold.co/120x170?text=${encodeURIComponent(title || 'Book')}`;

let guestApiAvailable = false;

function guestHeaders() {
  return { 'X-Guest-Token': getGuestToken() };
}

function mapLocalItems(items) {
  return items.map((item) => ({
    itemId: item.itemId,
    bookId: item.bookId,
    title: item.title || 'Untitled book',
    coverUrl: item.coverUrl || fallbackCover(item.title),
    price: item.price || 0,
    quantity: item.quantity || 1,
    lineTotal: (item.price || 0) * (item.quantity || 1),
    available: item.available !== false,
  }));
}

function buildLocalCart(items = getGuestCartItems()) {
  const mapped = mapLocalItems(items);
  return {
    id: 'guest',
    items: mapped,
    subtotal: mapped.reduce((sum, item) => sum + item.lineTotal, 0),
  };
}

function mapApiCartItem(item) {
  const title = item.bookTitle || item.title || 'Untitled book';
  return {
    itemId: item.id ?? item.itemId,
    bookId: item.bookId,
    title,
    coverUrl: item.bookCoverUrl || item.coverUrl || fallbackCover(title),
    price: item.bookPrice ?? item.price ?? 0,
    quantity: item.quantity || 1,
    lineTotal: item.lineTotal || 0,
    available: item.available,
  };
}

function mapApiCart(cart) {
  return {
    id: cart?.id ?? 'guest',
    items: (cart?.items || []).map(mapApiCartItem),
    subtotal: cart?.subtotal || 0,
  };
}

function isGuestApiUnavailable(err) {
  const code = err?.code;
  const type = err?.error_type;
  return (
    code === 401
    || code === 403
    || code === 404
    || code === 405
    || code === 501
    || type === 'UNAUTHORIZED'
    || type === 'FORBIDDEN'
    || type === 'RESOURCE_NOT_FOUND'
  );
}

async function tryGuestApi(request) {
  if (guestApiAvailable === false) return null;
  try {
    const result = await request();
    guestApiAvailable = true;
    return result;
  } catch (err) {
    // Backend guest endpoints may not exist yet ? fall back to localStorage cart.
    if (isGuestApiUnavailable(err)) {
      guestApiAvailable = false;
      return null;
    }
    throw err;
  }
}

function upsertLocalItem(book, quantity) {
  const items = getGuestCartItems();
  const itemId = guestItemIdForBook(book.id);
  const existing = items.find((item) => item.bookId === book.id || item.itemId === itemId);

  if (existing) {
    existing.quantity = Math.max(1, (existing.quantity || 0) + quantity);
    existing.title = book.title || existing.title;
    existing.coverUrl = book.coverUrl || existing.coverUrl;
    existing.price = book.price ?? existing.price;
    existing.available = book.stock == null ? existing.available : book.stock > 0;
  } else {
    items.push({
      itemId,
      bookId: book.id,
      title: book.title || 'Untitled book',
      coverUrl: book.coverUrl || fallbackCover(book.title),
      price: book.price || 0,
      quantity: Math.max(1, quantity),
      available: book.stock == null ? true : book.stock > 0,
    });
  }

  setGuestCartItems(items);
  return buildLocalCart(items);
}

export const guestCartService = {
  async getCart() {
    const remote = await tryGuestApi(() =>
      apiClient.get('/guest/cart', { auth: false, headers: guestHeaders() }),
    );
    if (remote) {
      const mapped = mapApiCart(remote);
      setGuestCartItems(
        mapped.items.map((item) => ({
          itemId: item.itemId,
          bookId: item.bookId,
          title: item.title,
          coverUrl: item.coverUrl,
          price: item.price,
          quantity: item.quantity,
          available: item.available,
        })),
      );
      return mapped;
    }
    return buildLocalCart();
  },

  async addItem(book, quantity = 1) {
    const remote = await tryGuestApi(() =>
      apiClient.post(
        '/guest/cart/items',
        { bookId: book.id, quantity },
        { auth: false, headers: guestHeaders() },
      ),
    );
    if (remote) return mapApiCart(remote);
    return upsertLocalItem(book, quantity);
  },

  async updateQuantity(itemId, bookId, quantity) {
    const nextQty = Math.max(1, quantity);
    const remote = await tryGuestApi(() =>
      apiClient.put(
        `/guest/cart/items/${itemId}`,
        { bookId, quantity: nextQty },
        { auth: false, headers: guestHeaders() },
      ),
    );
    if (remote) return mapApiCart(remote);

    const items = getGuestCartItems().map((item) =>
      String(item.itemId) === String(itemId) || item.bookId === bookId
        ? { ...item, quantity: nextQty }
        : item,
    );
    setGuestCartItems(items);
    return buildLocalCart(items);
  },

  async removeItem(itemId) {
    const remote = await tryGuestApi(() =>
      apiClient.delete(`/guest/cart/items/${itemId}`, {
        auth: false,
        headers: guestHeaders(),
      }),
    );
    if (remote) return mapApiCart(remote);

    const items = getGuestCartItems().filter((item) => String(item.itemId) !== String(itemId));
    setGuestCartItems(items);
    return buildLocalCart(items);
  },

  clearLocal() {
    clearGuestCart();
  },
};
