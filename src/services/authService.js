import { apiClient, refreshAccessToken } from './apiClient';
import { tokenStorage } from './tokenStorage';

function normalizeEmail(email) {
  return email?.trim().toLowerCase();
}

export const authService = {
  getCurrentUser() {
    return tokenStorage.getUser();
  },

  async syncSession() {
    if (!tokenStorage.getAccessToken() && !tokenStorage.getRefreshToken()) {
      tokenStorage.clear();
      return null;
    }
    try {
      if (!tokenStorage.getAccessToken() && tokenStorage.getRefreshToken()) {
        await refreshAccessToken();
      }
      const profile = await apiClient.get('/users/me');
      tokenStorage.setUser(profile);
      return profile;
    } catch {
      tokenStorage.clear();
      return null;
    }
  },

  async register({ email, password, fullName }) {
    return apiClient.post(
      '/auth/register',
      { email: normalizeEmail(email), password, fullName: fullName?.trim() },
      { auth: false },
    );
  },

  async verifyEmail({ email, otp }) {
    await apiClient.post(
      '/auth/verify-email',
      { email: normalizeEmail(email), otp: otp?.trim() },
      { auth: false },
    );
    return { message: 'Email verified successfully' };
  },

  async resendVerification({ email }) {
    await apiClient.post(
      '/auth/resend-verification',
      { email: normalizeEmail(email) },
      { auth: false },
    );
    return { message: 'If the email exists, a new OTP has been sent.' };
  },

  async login({ email, password }) {
    const data = await apiClient.post(
      '/auth/login',
      { email: normalizeEmail(email), password },
      { auth: false },
    );
    tokenStorage.setSession({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
    });
    return data.user;
  },

  async logout() {
    const refreshToken = tokenStorage.getRefreshToken();
    try {
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken });
      }
    } catch {
      // Session may already be invalid; still clear local state.
    } finally {
      tokenStorage.clear();
    }
  },

  async forgotPassword({ email }) {
    await apiClient.post(
      '/auth/forgot-password',
      { email: normalizeEmail(email) },
      { auth: false },
    );
    return { message: 'If the email exists, an OTP has been sent.' };
  },

  async resetPassword({ email, otp, newPassword }) {
    await apiClient.post(
      '/auth/reset-password',
      {
        email: normalizeEmail(email),
        otp: otp?.trim(),
        newPassword,
      },
      { auth: false },
    );
    return { message: 'Password reset successfully.' };
  },
};
