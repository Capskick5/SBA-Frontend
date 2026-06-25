import { mockCartItems } from '../mocks/mockData';

let cartItems = [...mockCartItems];
let selectedItemIds = new Set(cartItems.map((item) => item.itemId));

const recalculate = () =>
  cartItems.map((item) => ({ ...item, lineTotal: item.price * item.quantity }));

export const cartService = {
  getCart() {
    cartItems = recalculate();
    return Promise.resolve({
      items: cartItems.map((item) => ({ ...item, selected: selectedItemIds.has(item.itemId) })),
      subtotal: cartItems.reduce((sum, item) => sum + item.lineTotal, 0),
      selectedSubtotal: cartItems
        .filter((item) => selectedItemIds.has(item.itemId))
        .reduce((sum, item) => sum + item.lineTotal, 0),
    });
  },
  addItem(book, quantity = 1) {
    const existing = cartItems.find((item) => item.bookId === book.id);
    if (existing) {
      existing.quantity += quantity;
      selectedItemIds.add(existing.itemId);
    } else {
      cartItems.push({
        itemId: Date.now(),
        bookId: book.id,
        title: book.title,
        coverUrl: book.coverUrl,
        price: book.price,
        quantity,
        lineTotal: book.price * quantity,
      });
      selectedItemIds.add(cartItems[cartItems.length - 1].itemId);
    }
    return this.getCart();
  },
  updateQuantity(itemId, quantity) {
    cartItems = cartItems.map((item) =>
      item.itemId === itemId ? { ...item, quantity: Math.max(1, quantity) } : item,
    );
    return this.getCart();
  },
  removeItem(itemId) {
    cartItems = cartItems.filter((item) => item.itemId !== itemId);
    selectedItemIds.delete(itemId);
    return this.getCart();
  },
  toggleSelected(itemId, selected) {
    if (selected) selectedItemIds.add(itemId);
    else selectedItemIds.delete(itemId);
    return this.getCart();
  },
  getSelectedCart() {
    cartItems = recalculate();
    const items = cartItems.filter((item) => selectedItemIds.has(item.itemId));
    return Promise.resolve({
      items,
      subtotal: items.reduce((sum, item) => sum + item.lineTotal, 0),
    });
  },
  getSelectedItemIds() {
    return Promise.resolve([...selectedItemIds]);
  },
  setSelectedItemIds(ids) {
    selectedItemIds = new Set(ids);
    return this.getCart();
  },
};
