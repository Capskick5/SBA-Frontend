import {
  delay,
  findUserInDb,
  getSessionUser,
  saveUsersDb,
  setSessionUser,
  toPublicUser,
} from '../mocks/mockStore';
import { createError } from './apiError';

function requireSessionUserDb() {
  const session = getSessionUser();
  if (!session) {
    throw createError({ code: 401, error_type: 'UNAUTHORIZED' });
  }
  const { db, user } = findUserInDb(session.email);
  if (!user) {
    throw createError({ code: 404, error_type: 'RESOURCE_NOT_FOUND' });
  }
  return { db, user };
}

export const profileService = {
  async getProfile() {
    await delay();
    const { user } = requireSessionUserDb();
    return toPublicUser(user);
  },

  async updateProfile({ fullName }) {
    await delay();
    const { db, user } = requireSessionUserDb();
    if (!fullName?.trim()) {
      throw createError({
        code: 400,
        error_type: 'VALIDATION_ERROR',
        errors: { fullName: 'Ho ten khong duoc de trong.' },
      });
    }
    user.fullName = fullName.trim();
    user.updatedAt = new Date().toISOString();
    saveUsersDb(db);
    const publicUser = toPublicUser(user);
    setSessionUser(publicUser);
    return publicUser;
  },

  async changePassword({ currentPassword, newPassword }) {
    await delay();
    const { db, user } = requireSessionUserDb();
    if (user.password !== currentPassword) {
      throw createError({
        code: 400,
        error_type: 'VALIDATION_ERROR',
        errors: { currentPassword: 'Mat khau hien tai khong dung.' },
      });
    }
    if (!newPassword?.trim()) {
      throw createError({
        code: 400,
        error_type: 'VALIDATION_ERROR',
        errors: { newPassword: 'Mat khau moi khong duoc de trong.' },
      });
    }
    user.password = newPassword;
    user.updatedAt = new Date().toISOString();
    saveUsersDb(db);
    return { message: 'Doi mat khau thanh cong.' };
  },
};
