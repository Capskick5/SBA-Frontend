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

const BACKEND_MESSAGE_TRANSLATIONS = {
  'You can only review a book after you have received it (order delivered).':
    'Bạn chỉ có thể đánh giá sách sau khi đã nhận được hàng (đơn hàng đã giao).',
  'You have already reviewed this book.':
    'Bạn đã đánh giá cuốn sách này rồi.',
  'Only DELIVERED orders can be reviewed.':
    'Chỉ các đơn hàng đã giao thành công mới có thể đánh giá.',
  'Order does not belong to current user':
    'Đơn hàng không thuộc về tài khoản của bạn.',
  'Order is not awaiting payment':
    'Đơn hàng không ở trạng thái chờ thanh toán.',
  'Payment window has expired':
    'Đã hết thời gian thanh toán cho đơn hàng này.',
  'Category name already exists':
    'Tên danh mục này đã tồn tại.',
  'Cannot deactivate category with active books':
    'Không thể tắt danh mục đang có sách hoạt động.',
  'Email already in use':
    'Email này đã được sử dụng.',
  'Email is already verified':
    'Email này đã được xác minh trước đó.',
  'Invalid credentials':
    'Email hoặc mật khẩu không chính xác.',
  'Account is disabled':
    'Tài khoản này đã bị vô hiệu hóa.',
  'Email is not verified':
    'Email chưa được xác minh. Vui lòng xác minh trước khi đăng nhập.',
  'Invalid or expired OTP':
    'Mã OTP không hợp lệ hoặc đã hết hạn.',
  'Too many invalid OTP attempts. Please request a new code.':
    'Bạn đã nhập sai OTP quá nhiều lần. Vui lòng gửi lại mã mới.',
  'Rate limit exceeded for OTP generation. Please try again later.':
    'Bạn đã yêu cầu gửi OTP quá nhiều lần. Vui lòng thử lại sau.',
  'Voucher code already exists':
    'Mã giảm giá này đã tồn tại.',
  'Voucher has expired':
    'Mã giảm giá này đã hết hạn.',
  'Voucher is not active':
    'Mã giảm giá hiện không hoạt động.',
  'Voucher usage limit reached':
    'Mã giảm giá này đã hết lượt sử dụng.',
  'Min order value not met':
    'Đơn hàng chưa đạt giá trị tối thiểu để áp dụng mã này.',
  'Book out of stock':
    'Sách này hiện đã hết hàng.',
  'Stock not available':
    'Số lượng sách trong kho không đủ.',
  'Idempotency key is already used':
    'Yêu cầu thanh toán trước đó đã được ghi nhận. Vui lòng thử lại.',
  'Unable to create VNPAY checkout link':
    'Không tạo được liên kết thanh toán. Vui lòng thử lại.',
  'User not found':
    'Không tìm thấy thông tin người dùng.',
  'Book not found':
    'Không tìm thấy thông tin sách.',
  'Category not found':
    'Không tìm thấy danh mục.',
  'Campaign not found':
    'Không tìm thấy chiến dịch.',
  'Voucher not found':
    'Không tìm thấy mã giảm giá.',
  'Order not found':
    'Không tìm thấy đơn hàng.',
  'API request failed.':
    'Yêu cầu kết nối thất bại.',
};

export function translateErrorMessage(message) {
  if (!message || typeof message !== 'string') return message;
  const trimmed = message.trim();
  if (BACKEND_MESSAGE_TRANSLATIONS[trimmed]) {
    return BACKEND_MESSAGE_TRANSLATIONS[trimmed];
  }
  if (trimmed.includes('RAG service')) return 'Dịch vụ AI tư vấn sách hiện không khả dụng.';
  if (trimmed.includes('out of stock')) return 'Một số sản phẩm trong kho hiện không đủ số lượng.';
  if (trimmed.includes('already reviewed')) return 'Bạn đã đánh giá cuốn sách này rồi.';
  if (trimmed.includes('order delivered') || trimmed.includes('only review')) return 'Bạn chỉ có thể đánh giá sách sau khi đã nhận được hàng (đơn hàng đã giao).';
  return message;
}

export function createError({ code = 400, message, error_type, errors = null }) {
  const translatedMessage = translateErrorMessage(message);
  const err = new Error(translatedMessage || ERROR_MESSAGES[error_type] || 'Đã xảy ra lỗi.');
  err.code = code;
  err.error_type = error_type;
  err.errors = errors;
  return err;
}

export function isApiError(err) {
  return Boolean(err?.error_type);
}
