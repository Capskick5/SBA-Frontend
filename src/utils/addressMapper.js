export function mapAddressFromApi(dto) {
  if (!dto) return null;
  return {
    id: dto.id,
    recipient: dto.recipient,
    phone: dto.phone,
    line: dto.line,
    ward: dto.ward || '',
    district: dto.district || '',
    city: dto.city,
    isDefault: dto.isDefault ?? dto.default ?? false,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function mapAddressToApi(payload) {
  const isDefault = Boolean(payload.isDefault);
  return {
    recipient: payload.recipient,
    phone: payload.phone,
    line: payload.line,
    ward: payload.ward || '',
    district: payload.district || '',
    city: payload.city,
    default: isDefault,
    isDefault,
  };
}
