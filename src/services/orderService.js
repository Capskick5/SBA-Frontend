import { mockOrders } from '../mocks/mockData';

export const orderService = {
  getOrders() {
    return Promise.resolve(mockOrders);
  },
  getOrderById(id) {
    return Promise.resolve(mockOrders.find((order) => String(order.id) === String(id)) || mockOrders[0]);
  },
};
