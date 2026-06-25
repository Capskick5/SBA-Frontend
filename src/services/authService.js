import { mockUsers } from '../mocks/mockData';

const STORAGE_KEY = 'bookverse_mock_user';

export const authService = {
  getCurrentUser() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  login({ email }) {
    const user = email?.includes('admin') ? mockUsers.admin : mockUsers.customer;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    return Promise.resolve(user);
  },
  register(payload) {
    return Promise.resolve({ ...mockUsers.customer, ...payload });
  },
  logout() {
    localStorage.removeItem(STORAGE_KEY);
    return Promise.resolve();
  },
};
