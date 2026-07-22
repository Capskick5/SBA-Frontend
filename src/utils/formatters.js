export const formatCurrency = (value) =>
  `${new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(value || 0)} VND`;

export const formatProductPrice = formatCurrency;

export const normalizeText = (value) => String(value || '').trim().toLowerCase();

const toValidDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatDate = (value, fallback = 'Không có') => {
  const date = toValidDate(value);
  if (!date) return fallback;

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

export const formatDateTime = (value, fallback = 'Không có') => {
  const date = toValidDate(value);
  if (!date) return fallback;

  const time = new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);

  return `${formatDate(date, fallback)} ${time}`;
};

const CATEGORY_VI_MAP = {
  'Business & Finance': 'Kinh doanh & Tài chính',
  'Technology & Computing': 'Công nghệ & Máy tính',
  'Psychology & Self-Help': 'Tâm lý & Phát triển bản thân',
  'Science & Mathematics': 'Khoa học & Toán học',
  "Children's Books": 'Sách thiếu nhi',
  'History, Politics & International Relations': 'Lịch sử & Chính trị',
  'Fiction & Literature': 'Văn học & Tiểu thuyết',
  'Religion & Spirituality': 'Tôn giáo & Tâm linh',
  'Health & Fitness': 'Sức khỏe & Đời sống',
  'Education': 'Giáo dục & Sư phạm',
  'Social Sciences': 'Khoa học xã hội',
  'Arts & Photography': 'Nghệ thuật & Nhiếp ảnh',
  'Biographies & Memoirs': 'Tiểu sử & Hồi ký',
  'Cookbooks, Food & Wine': 'Ẩm thực & Nấu ăn',
};

export const formatCategoryName = (name) => {
  if (!name) return 'Tổng hợp';
  if (name === 'all' || name === 'Tất cả') return 'Tất cả';
  return CATEGORY_VI_MAP[name] || name;
};
