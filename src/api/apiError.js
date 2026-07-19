export const ERROR_MESSAGES = {
  VALIDATION_ERROR: 'The submitted data is invalid.',
  UNAUTHORIZED: 'Email or password is incorrect.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  RESOURCE_NOT_FOUND: 'Resource not found.',
  DUPLICATE_RESOURCE: 'Email is already in use.',
  EMAIL_NOT_VERIFIED: 'Email is not verified. Please verify it before logging in.',
  ACCOUNT_DISABLED: 'This account has been disabled.',
  OTP_INVALID: 'OTP is invalid.',
  OTP_EXPIRED: 'OTP has expired.',
  RATE_LIMITED: 'Please try again in a few minutes.',
};

export function createError({ code = 400, message, error_type, errors = null }) {
  const err = new Error(message || ERROR_MESSAGES[error_type] || 'Something went wrong.');
  err.code = code;
  err.error_type = error_type;
  err.errors = errors;
  return err;
}

export function isApiError(err) {
  return Boolean(err?.error_type);
}
