import { apiClient } from '../api/apiClient';
import { createError } from '../api/apiError';
import {
  clearGuestCart,
  getGuestCartItems,
  getGuestToken,
  guestItemIdForBook,
  setGuestCartItems,
} from '../storage/guestCartStorage';

const fallbackCover = (title) =>
  `https://placehold.co/120x170?text=${encodeURIComponent(title || 'Book')}`;

const STOCK_EXCEEDED_MESSAGE = 'Số lượng vượt quá tồn kho hiện có.';

let guestApiAvailable = false;

function resolveStockLimit(source) {
  if (source?.stock == null || source.stock === '') return null;
  const stock = Number(source.stock);
  return Number.isFinite(stock) ? Math.max(0, stock) : null;
}

function assertWithinStock(nextQty, stockLimit, currentQty = 0) {
  if (stockLimit == null) return;
  if (stockLimit <= 0) {
    throw createError({
      code: 400,
      error_type: 'VALIDATION_ERROR',
      message: 'Sách này hiện đã hết hàng.',
    });
  }
  if (nextQty > stockLimit) {
    throw createError({
      code: 400,
      error_type: 'VALIDATION_ERROR',
      message: currentQty >= stockLimit
        ? `Giỏ đã có đủ số lượng còn lại (${stockLimit} cuốn).`
        : STOCK_EXCEEDED_MESSAGE,
    });
  }
}

function guestHeaders() {
  return { 'X-Guest-Token': getGuestToken() };
}

function mapLocalItems(items) {
  return items.map((item) => {
    const stock = resolveStockLimit(item);
    const quantity = item.quantity || 1;
    return {
      itemId: item.itemId,
      bookId: item.bookId,
      title: item.title || 'Untitled book',
      coverUrl: item.coverUrl || fallbackCover(item.title),
      price: item.price || 0,
      quantity,
      stock,
      lineTotal: (item.price || 0) * quantity,
      available: item.available !== false && (stock == null || stock > 0),
    };
  });
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
  const addQty = Math.max(1, Number(quantity) || 1);
  const stockLimit = resolveStockLimit(book);
  const items = getGuestCartItems();
  const itemId = guestItemIdForBook(book.id);
  const existing = items.find((item) => item.bookId === book.id || item.itemId === itemId);
  const currentQty = existing?.quantity || 0;
  const nextQty = currentQty + addQty;

  assertWithinStock(nextQty, stockLimit, currentQty);

  if (existing) {
    existing.quantity = nextQty;
    existing.title = book.title || existing.title;
    existing.coverUrl = book.coverUrl || existing.coverUrl;
    existing.price = book.price ?? existing.price;
    existing.stock = stockLimit ?? existing.stock ?? null;
    existing.available = stockLimit == null ? existing.available !== false : stockLimit > 0;
  } else {
    items.push({
      itemId,
      bookId: book.id,
      title: book.title || 'Untitled book',
      coverUrl: book.coverUrl || fallbackCover(book.title),
      price: book.price || 0,
      quantity: nextQty,
      stock: stockLimit,
      available: stockLimit == null ? true : stockLimit > 0,
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
          stock: item.stock ?? null,
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

    const items = getGuestCartItems();
    const target = items.find(
      (item) => String(item.itemId) === String(itemId) || item.bookId === bookId,
    );
    if (target) {
      assertWithinStock(nextQty, resolveStockLimit(target), target.quantity || 0);
    }

    const nextItems = items.map((item) =>
      String(item.itemId) === String(itemId) || item.bookId === bookId
        ? { ...item, quantity: nextQty }
        : item,
    );
    setGuestCartItems(nextItems);
    return buildLocalCart(nextItems);
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
