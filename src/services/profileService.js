import { apiClient } from '../api/apiClient';
import { tokenStorage } from '../storage/tokenStorage';

export const profileService = {
  async getProfile() {
    const profile = await apiClient.get('/users/me');
    tokenStorage.setUser(profile);
    return profile;
  },

  async updateProfile({ fullName }) {
    const profile = await apiClient.put('/users/me', { fullName: fullName?.trim() });
    tokenStorage.setUser(profile);
    return profile;
  },

  async changePassword({ currentPassword, newPassword }) {
    await apiClient.put('/users/me/password', { currentPassword, newPassword });
    tokenStorage.clear();
    return { message: 'Password changed successfully.' };
  },
};
