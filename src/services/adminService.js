import { mockAdminStats, mockBooks, mockCategories, mockOrders, mockReviews, mockUsers } from '../mocks/mockData';

export const adminService = {
  getStats: () => Promise.resolve(mockAdminStats),
  getBooks: () => Promise.resolve(mockBooks),
  getCategories: () => Promise.resolve(mockCategories),
  getOrders: () => Promise.resolve(mockOrders),
  getUsers: () => Promise.resolve(Object.values(mockUsers)),
  getReviews: () => Promise.resolve(mockReviews),
};
