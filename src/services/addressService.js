import {
  delay,
  getSessionUser,
  getUserAddresses,
  setUserAddresses,
} from '../mocks/mockStore';
import { createError } from './apiError';

function requireUserId() {
  const user = getSessionUser();
  if (!user) {
    throw createError({ code: 401, error_type: 'UNAUTHORIZED' });
  }
  return user.id;
}

function validatePayload(payload) {
  const errors = {};
  if (!payload.recipient?.trim()) errors.recipient = 'Nguoi nhan khong duoc de trong.';
  if (!payload.phone?.trim()) errors.phone = 'So dien thoai khong duoc de trong.';
  if (!payload.line?.trim()) errors.line = 'Dia chi khong duoc de trong.';
  if (!payload.city?.trim()) errors.city = 'Thanh pho khong duoc de trong.';
  if (Object.keys(errors).length) {
    throw createError({ code: 400, error_type: 'VALIDATION_ERROR', errors });
  }
}

function normalizePayload(payload) {
  return {
    recipient: payload.recipient.trim(),
    phone: payload.phone.trim(),
    line: payload.line.trim(),
    ward: payload.ward?.trim() || '',
    district: payload.district?.trim() || '',
    city: payload.city.trim(),
    isDefault: Boolean(payload.isDefault),
  };
}

function applyDefault(addresses, targetId) {
  return addresses.map((a) => ({ ...a, isDefault: a.id === targetId }));
}

function nowIso() {
  return new Date().toISOString();
}

export const addressService = {
  async list() {
    await delay();
    const userId = requireUserId();
    return getUserAddresses(userId);
  },

  async create(payload) {
    await delay();
    const userId = requireUserId();
    validatePayload(payload);
    const data = normalizePayload(payload);
    let addresses = getUserAddresses(userId);
    const address = {
      id: Date.now(),
      ...data,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    if (data.isDefault || !addresses.length) {
      address.isDefault = true;
      addresses = addresses.map((a) => ({ ...a, isDefault: false }));
    }
    addresses.push(address);
    setUserAddresses(userId, addresses);
    return address;
  },

  async update(id, payload) {
    await delay();
    const userId = requireUserId();
    validatePayload(payload);
    const data = normalizePayload(payload);
    let addresses = getUserAddresses(userId);
    const index = addresses.findIndex((a) => a.id === id);
    if (index === -1) {
      throw createError({ code: 404, error_type: 'RESOURCE_NOT_FOUND' });
    }
    const updated = {
      ...addresses[index],
      ...data,
      updatedAt: nowIso(),
    };
    if (data.isDefault) {
      addresses = addresses.map((a) => ({ ...a, isDefault: false }));
      updated.isDefault = true;
    }
    addresses[index] = updated;
    setUserAddresses(userId, addresses);
    return updated;
  },

  async remove(id) {
    await delay();
    const userId = requireUserId();
    let addresses = getUserAddresses(userId);
    const target = addresses.find((a) => a.id === id);
    if (!target) {
      throw createError({ code: 404, error_type: 'RESOURCE_NOT_FOUND' });
    }
    addresses = addresses.filter((a) => a.id !== id);
    if (target.isDefault && addresses.length) {
      addresses[0] = { ...addresses[0], isDefault: true, updatedAt: nowIso() };
    }
    setUserAddresses(userId, addresses);
  },

  async setDefault(id) {
    await delay();
    const userId = requireUserId();
    let addresses = getUserAddresses(userId);
    if (!addresses.find((a) => a.id === id)) {
      throw createError({ code: 404, error_type: 'RESOURCE_NOT_FOUND' });
    }
    addresses = applyDefault(addresses, id).map((a) => ({
      ...a,
      updatedAt: a.id === id ? nowIso() : a.updatedAt,
    }));
    setUserAddresses(userId, addresses);
    return addresses.find((a) => a.id === id);
  },
};
