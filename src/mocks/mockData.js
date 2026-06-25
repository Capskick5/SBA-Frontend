import rawBooks from './books_rag_44_en_vi_only.json';

const coverFor = (index) => `https://placehold.co/240x340?text=Book+${index + 1}`;

export const mockBooks = rawBooks.map((book, index) => ({
  id: index + 1,
  title: book.title,
  author: book.authors?.[0] || 'Unknown author',
  category: book.category || 'General',
  description: book.description || '',
  price: 80000 + (index % 12) * 25000,
  coverUrl: coverFor(index),
  stock: index % 9 === 0 ? 0 : 3 + (index % 18),
  ratingAvg: Number((3.5 + (index % 15) / 10).toFixed(1)),
}));

export const mockCategories = Array.from(new Set(mockBooks.map((book) => book.category))).map(
  (name, index) => ({ id: index + 1, name }),
);

export const mockUsers = {
  customer: {
    id: 1,
    email: 'customer@bookverse.local',
    fullName: 'BookVerse Customer',
    role: 'CUSTOMER',
    emailVerified: true,
  },
  admin: {
    id: 2,
    email: 'admin@bookverse.local',
    fullName: 'BookVerse Admin',
    role: 'ADMIN',
    emailVerified: true,
  },
};

export const mockAddresses = [
  {
    id: 1,
    recipient: 'Nguyen Van A',
    phone: '0900000000',
    line: '123 Nguyen Trai',
    ward: 'Ben Thanh',
    district: 'Quan 1',
    city: 'Ho Chi Minh',
    isDefault: true,
  },
];

export const mockCartItems = mockBooks.slice(0, 2).map((book, index) => ({
  itemId: index + 1,
  bookId: book.id,
  title: book.title,
  coverUrl: book.coverUrl,
  price: book.price,
  quantity: index + 1,
  lineTotal: book.price * (index + 1),
}));

export const orderStatuses = [
  'PENDING_PAYMENT',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
];

export const mockOrders = orderStatuses.slice(0, 4).map((status, index) => {
  const item = mockBooks[index + 2];
  const subtotal = item.price * 1;
  const shippingFee = 30000;
  return {
    id: 1000 + index,
    status,
    paymentStatus: status === 'PENDING_PAYMENT' ? 'PENDING' : status === 'CANCELLED' ? 'CANCELLED' : 'PAID',
    items: [
      {
        bookId: item.id,
        titleSnapshot: item.title,
        unitPrice: item.price,
        quantity: 1,
        lineTotal: item.price,
      },
    ],
    addressSnapshot: mockAddresses[0],
    subtotal,
    shippingFee,
    total: subtotal + shippingFee,
    statusHistory: [
      { id: 1, toStatus: 'PENDING_PAYMENT', note: 'Order created' },
      ...(status !== 'PENDING_PAYMENT' ? [{ id: 2, toStatus: status, note: 'Mock transition' }] : []),
    ],
  };
});

export const mockReviews = mockBooks.slice(0, 5).map((book, index) => ({
  id: index + 1,
  bookId: book.id,
  userName: `Reader ${index + 1}`,
  rating: 4 + (index % 2),
  comment: 'Sach ro rang, phu hop de demo review UI.',
}));

export const mockAdminStats = {
  totalUsers: 2,
  totalBooks: mockBooks.length,
  activeBooks: mockBooks.filter((book) => book.stock > 0).length,
  totalOrders: mockOrders.length,
  recognizedRevenue: mockOrders.reduce((sum, order) => sum + order.total, 0),
  topSellingBooks: mockBooks.slice(0, 3),
};
