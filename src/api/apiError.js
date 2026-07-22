export const ERROR_MESSAGES = {
  VALIDATION_ERROR: 'Dữ liệu gửi lên không hợp lệ.',
  UNAUTHORIZED: 'Email hoặc mật khẩu không đúng.',
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
  RESOURCE_NOT_FOUND: 'Không tìm thấy tài nguyên.',
  DUPLICATE_RESOURCE: 'Email đã được sử dụng.',
  EMAIL_NOT_VERIFIED: 'Email chưa được xác minh. Vui lòng xác minh trước khi đăng nhập.',
  ACCOUNT_DISABLED: 'Tài khoản này đã bị vô hiệu hóa.',
  OTP_INVALID: 'Mã OTP không hợp lệ.',
  OTP_EXPIRED: 'Mã OTP đã hết hạn.',
  RATE_LIMITED: 'Vui lòng thử lại sau vài phút.',
};

export function createError({ code = 400, message, error_type, errors = null }) {
  const err = new Error(message || ERROR_MESSAGES[error_type] || 'Đã xảy ra lỗi.');
  err.code = code;
  err.error_type = error_type;
  err.errors = errors;
  return err;
}

export function isApiError(err) {
  return Boolean(err?.error_type);
}
