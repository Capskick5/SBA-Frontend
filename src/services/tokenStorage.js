const KEYS = {
  ACCESS: 'bookverse_access_token',
  REFRESH: 'bookverse_refresh_token',
  USER: 'bookverse_user',
};

export const tokenStorage = {
  getAccessToken() {
    return localStorage.getItem(KEYS.ACCESS);
  },

  getRefreshToken() {
    return localStorage.getItem(KEYS.REFRESH);
  },

  getUser() {
    const raw = localStorage.getItem(KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  },

  setSession({ accessToken, refreshToken, user }) {
    if (accessToken) localStorage.setItem(KEYS.ACCESS, accessToken);
    if (refreshToken) localStorage.setItem(KEYS.REFRESH, refreshToken);
    if (user) localStorage.setItem(KEYS.USER, JSON.stringify(user));
  },

  setUser(user) {
    if (user) {
      localStorage.setItem(KEYS.USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(KEYS.USER);
    }
  },

  clear() {
    localStorage.removeItem(KEYS.ACCESS);
    localStorage.removeItem(KEYS.REFRESH);
    localStorage.removeItem(KEYS.USER);
    localStorage.removeItem('bookverse_mock_user');
  },
};
