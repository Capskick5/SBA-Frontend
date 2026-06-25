export const ERROR_MESSAGES = {
  VALIDATION_ERROR: 'Du lieu khong hop le.',
  UNAUTHORIZED: 'Email hoac mat khau khong dung.',
  FORBIDDEN: 'Ban khong co quyen thuc hien thao tac nay.',
  RESOURCE_NOT_FOUND: 'Khong tim thay tai nguyen.',
  DUPLICATE_RESOURCE: 'Email da duoc su dung.',
  EMAIL_NOT_VERIFIED: 'Email chua duoc xac thuc. Vui long xac thuc truoc khi dang nhap.',
  ACCOUNT_DISABLED: 'Tai khoan da bi vo hieu hoa.',
  OTP_INVALID: 'Ma OTP khong dung.',
  OTP_EXPIRED: 'Ma OTP da het han.',
  RATE_LIMITED: 'Vui long thu lai sau it phut.',
};

export function createError({ code = 400, message, error_type, errors = null }) {
  const err = new Error(message || ERROR_MESSAGES[error_type] || 'Co loi xay ra.');
  err.code = code;
  err.error_type = error_type;
  err.errors = errors;
  return err;
}

export function isApiError(err) {
  return Boolean(err?.error_type);
}
