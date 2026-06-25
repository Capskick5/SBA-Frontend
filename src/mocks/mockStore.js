import { mockAddresses, mockUsers } from './mockData';

export const STORAGE_KEYS = {
  USER: 'bookverse_user',
  USERS_DB: 'bookverse_users_db',
  OTP: 'bookverse_otp',
  ADDRESSES: 'bookverse_addresses',
};

export const MOCK_OTP = '123456';
export const OTP_RATE_LIMIT_MS = 30_000;

export function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

export function initUsersDb() {
  let db = readJson(STORAGE_KEYS.USERS_DB, null);
  if (!db) {
    db = {
      users: [
        {
          ...mockUsers.customer,
          enabled: true,
          emailVerified: true,
          password: 'password',
          createdAt: nowIso(),
          updatedAt: nowIso(),
        },
        {
          ...mockUsers.admin,
          enabled: true,
          emailVerified: true,
          password: 'password',
          createdAt: nowIso(),
          updatedAt: nowIso(),
        },
      ],
    };
    writeJson(STORAGE_KEYS.USERS_DB, db);
  }
  return db;
}

export function getUsersDb() {
  return initUsersDb();
}

export function saveUsersDb(db) {
  writeJson(STORAGE_KEYS.USERS_DB, db);
}

export function findUserByEmail(email) {
  const normalized = email?.trim().toLowerCase();
  return getUsersDb().users.find((u) => u.email === normalized) || null;
}

export function findUserInDb(email) {
  const db = getUsersDb();
  const normalized = email?.trim().toLowerCase();
  const user = db.users.find((u) => u.email === normalized) || null;
  return { db, user };
}

export function toPublicUser(user) {
  if (!user) return null;
  const { password: _pw, ...publicUser } = user;
  void _pw;
  return publicUser;
}

export function getSessionUser() {
  const legacy = localStorage.getItem('bookverse_mock_user');
  if (legacy && !localStorage.getItem(STORAGE_KEYS.USER)) {
    writeJson(STORAGE_KEYS.USER, JSON.parse(legacy));
    localStorage.removeItem('bookverse_mock_user');
  }
  return readJson(STORAGE_KEYS.USER, null);
}

export function setSessionUser(user) {
  if (user) {
    writeJson(STORAGE_KEYS.USER, toPublicUser(user));
  } else {
    localStorage.removeItem(STORAGE_KEYS.USER);
  }
}

export function getOtpStore() {
  return readJson(STORAGE_KEYS.OTP, {});
}

export function saveOtpStore(store) {
  writeJson(STORAGE_KEYS.OTP, store);
}

export function otpKey(type, email) {
  return `${type}:${email.trim().toLowerCase()}`;
}

export function getAddressesStore() {
  return readJson(STORAGE_KEYS.ADDRESSES, {});
}

export function saveAddressesStore(store) {
  writeJson(STORAGE_KEYS.ADDRESSES, store);
}

export function getUserAddresses(userId) {
  const store = getAddressesStore();
  return store[String(userId)] || [];
}

export function setUserAddresses(userId, addresses) {
  const store = getAddressesStore();
  store[String(userId)] = addresses;
  saveAddressesStore(store);
}

export function seedAddressesForUser(userId) {
  const existing = getUserAddresses(userId);
  if (existing.length) return existing;
  const seeded = mockAddresses.map((a, i) => ({
    ...a,
    id: Date.now() + i,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }));
  setUserAddresses(userId, seeded);
  return seeded;
}

export function delay(ms = 300) {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}
