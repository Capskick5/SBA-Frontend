import { mockAdminStats, mockBooks, mockCategories, mockOrders, mockReviews, mockUsers } from '../mocks/mockData';

let categories = [...mockCategories];

export const adminService = {
  getStats: () => Promise.resolve(mockAdminStats),
  getBooks: () => Promise.resolve(mockBooks),
  getCategories: () => Promise.resolve(categories),
  createCategory: (name) => {
    categories = [...categories, { id: Date.now(), name, active: true }];
    return Promise.resolve(categories);
  },
  updateCategory: (id, name) => {
    categories = categories.map((category) => (category.id === id ? { ...category, name } : category));
    return Promise.resolve(categories);
  },
  toggleCategoryActive: (id) => {
    categories = categories.map((category) =>
      category.id === id ? { ...category, active: !category.active } : category,
    );
    return Promise.resolve(categories);
  },
  deleteCategory: (id) => {
    categories = categories.filter((category) => category.id !== id);
    return Promise.resolve(categories);
  },
  getOrders: () => Promise.resolve(mockOrders),
  getOrderById: (id) => Promise.resolve(mockOrders.find((order) => String(order.id) === String(id)) || mockOrders[0]),
  updateOrderStatus: (id, status, shipping = {}) =>
    Promise.resolve({
      ...(mockOrders.find((order) => String(order.id) === String(id)) || mockOrders[0]),
      status,
      shippingProvider: shipping.shippingProvider,
      trackingCode: shipping.trackingCode,
    }),
  getUsers: () => Promise.resolve(Object.values(mockUsers)),
  getReviews: () => Promise.resolve(mockReviews),
};
