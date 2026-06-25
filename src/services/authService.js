import {
  MOCK_OTP,
  OTP_RATE_LIMIT_MS,
  delay,
  findUserByEmail,
  findUserInDb,
  getOtpStore,
  getSessionUser,
  getUsersDb,
  initUsersDb,
  otpKey,
  saveOtpStore,
  saveUsersDb,
  seedAddressesForUser,
  setSessionUser,
  toPublicUser,
} from '../mocks/mockStore';
import { createError } from './apiError';

// Demo OTP for wireframe: 123456

function normalizeEmail(email) {
  return email?.trim().toLowerCase();
}

function setOtp(type, email) {
  const store = getOtpStore();
  const key = otpKey(type, email);
  store[key] = { otp: MOCK_OTP, sentAt: Date.now(), type };
  saveOtpStore(store);
  return MOCK_OTP;
}

function checkOtp(type, email, otp) {
  const store = getOtpStore();
  const key = otpKey(type, email);
  const entry = store[key];
  if (!entry) {
    throw createError({ code: 400, error_type: 'OTP_INVALID' });
  }
  const expired = Date.now() - entry.sentAt > 10 * 60 * 1000;
  if (expired) {
    throw createError({ code: 400, error_type: 'OTP_EXPIRED' });
  }
  if (entry.otp !== otp?.trim()) {
    throw createError({ code: 400, error_type: 'OTP_INVALID' });
  }
  delete store[key];
  saveOtpStore(store);
}

function checkResendRateLimit(type, email) {
  const store = getOtpStore();
  const key = otpKey(type, email);
  const entry = store[key];
  if (entry && Date.now() - entry.sentAt < OTP_RATE_LIMIT_MS) {
    throw createError({ code: 429, error_type: 'RATE_LIMITED' });
  }
}

export const authService = {
  getCurrentUser() {
    initUsersDb();
    return getSessionUser();
  },

  async register({ email, password, fullName }) {
    await delay();
    const normalized = normalizeEmail(email);
    if (!normalized || !password || !fullName?.trim()) {
      throw createError({
        code: 400,
        error_type: 'VALIDATION_ERROR',
        errors: { form: 'Vui long dien day du thong tin.' },
      });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw createError({
        code: 400,
        error_type: 'VALIDATION_ERROR',
        errors: { email: 'Email khong dung dinh dang.' },
      });
    }
    const existing = findUserByEmail(normalized);
    if (existing) {
      throw createError({ code: 409, error_type: 'DUPLICATE_RESOURCE' });
    }

    const db = getUsersDb();
    const user = {
      id: Date.now(),
      email: normalized,
      fullName: fullName.trim(),
      role: 'CUSTOMER',
      enabled: true,
      emailVerified: false,
      password,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.users.push(user);
    saveUsersDb(db);
    setOtp('verify', normalized);
    return toPublicUser(user);
  },

  async verifyEmail({ email, otp }) {
    await delay();
    const normalized = normalizeEmail(email);
    const { db, user } = findUserInDb(normalized);
    if (!user) {
      throw createError({ code: 404, error_type: 'RESOURCE_NOT_FOUND' });
    }
    if (user.emailVerified) {
      return toPublicUser(user);
    }
    checkOtp('verify', normalized, otp);
    user.emailVerified = true;
    user.updatedAt = new Date().toISOString();
    saveUsersDb(db);
    return toPublicUser(user);
  },

  async resendVerification({ email }) {
    await delay();
    const normalized = normalizeEmail(email);
    const user = findUserByEmail(normalized);
    if (!user || user.emailVerified) {
      return { message: 'Neu email ton tai, ma OTP da duoc gui.' };
    }
    checkResendRateLimit('verify', normalized);
    setOtp('verify', normalized);
    return { message: 'Neu email ton tai, ma OTP da duoc gui.' };
  },

  async login({ email, password }) {
    await delay();
    const normalized = normalizeEmail(email);
    const user = findUserByEmail(normalized);
    if (!user || user.password !== password) {
      throw createError({ code: 401, error_type: 'UNAUTHORIZED' });
    }
    if (!user.emailVerified) {
      throw createError({ code: 403, error_type: 'EMAIL_NOT_VERIFIED' });
    }
    if (!user.enabled) {
      throw createError({ code: 403, error_type: 'ACCOUNT_DISABLED' });
    }
    const publicUser = toPublicUser(user);
    setSessionUser(publicUser);
    seedAddressesForUser(user.id);
    return publicUser;
  },

  async logout() {
    await delay(100);
    setSessionUser(null);
  },

  async forgotPassword({ email }) {
    await delay();
    const normalized = normalizeEmail(email);
    if (normalized) {
      setOtp('reset', normalized);
    }
    return { message: 'Neu email ton tai, ma OTP da duoc gui.' };
  },

  async resetPassword({ email, otp, newPassword }) {
    await delay();
    const normalized = normalizeEmail(email);
    const { db, user } = findUserInDb(normalized);
    if (!user) {
      throw createError({ code: 404, error_type: 'RESOURCE_NOT_FOUND' });
    }
    if (!newPassword?.trim()) {
      throw createError({
        code: 400,
        error_type: 'VALIDATION_ERROR',
        errors: { newPassword: 'Mat khau moi khong duoc de trong.' },
      });
    }
    checkOtp('reset', normalized, otp);
    user.password = newPassword;
    user.updatedAt = new Date().toISOString();
    saveUsersDb(db);
    return { message: 'Dat lai mat khau thanh cong.' };
  },
};
