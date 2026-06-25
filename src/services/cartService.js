import { mockCartItems } from '../mocks/mockData';

let cartItems = [...mockCartItems];

const recalculate = () =>
  cartItems.map((item) => ({ ...item, lineTotal: item.price * item.quantity }));

export const cartService = {
  getCart() {
    cartItems = recalculate();
    return Promise.resolve({
      items: cartItems,
      subtotal: cartItems.reduce((sum, item) => sum + item.lineTotal, 0),
    });
  },
  addItem(book, quantity = 1) {
    const existing = cartItems.find((item) => item.bookId === book.id);
    if (existing) {
      existing.quantity += quantity;
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
    return this.getCart();
  },
};
