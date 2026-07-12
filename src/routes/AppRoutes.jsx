import { Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AdminLayout from '../layouts/AdminLayout';
import { AdminRoute, CustomerRoute, ProtectedRoute, StorefrontRoute } from './RouteGuards';
import CatalogPage from '../pages/catalog/CatalogPage';
import BookDetailPage from '../pages/catalog/BookDetailPage';
import LoginPage from '../pages/auth/LoginPage';
import AdminLoginPage from '../pages/auth/AdminLoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import VerifyEmailPage from '../pages/auth/VerifyEmailPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '../pages/auth/ResetPasswordPage';
import CartPage from '../pages/cart/CartPage';
import CheckoutPage from '../pages/checkout/CheckoutPage';
import PaymentResultPage from '../pages/payment/PaymentResultPage';
import OrdersPage from '../pages/orders/OrdersPage';
import OrderDetailPage from '../pages/orders/OrderDetailPage';
import ProfilePage from '../pages/profile/ProfilePage';
import AddressesPage from '../pages/profile/AddressesPage';
import BookChatPage from '../pages/catalog/BookChatPage';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import AdminBooksPage from '../pages/admin/AdminBooksPage';
import AdminBookDetailPage from '../pages/admin/AdminBookDetailPage';
import AdminCategoriesPage from '../pages/admin/AdminCategoriesPage';
import AdminOrdersPage from '../pages/admin/AdminOrdersPage';
import AdminOrderDetailPage from '../pages/admin/AdminOrderDetailPage';
import AdminUsersPage from '../pages/admin/AdminUsersPage';
import AdminReviewsPage from '../pages/admin/AdminReviewsPage';
import AdminAddBookPage from '../pages/admin/AdminAddBookPage';
import AdminRagPage from '../pages/admin/AdminRagPage';
import AdminInventoryPage from '../pages/admin/AdminInventoryPage';
import AdminVouchersPage from '../pages/admin/AdminVouchersPage';

const main = (page) => (
  <StorefrontRoute>
    <MainLayout>{page}</MainLayout>
  </StorefrontRoute>
);
const protectedPage = (page) => main(<ProtectedRoute>{page}</ProtectedRoute>);
const customerPage = (page) => main(<CustomerRoute>{page}</CustomerRoute>);
const admin = (page) => (
  <AdminRoute>
    <AdminLayout>{page}</AdminLayout>
  </AdminRoute>
);

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={main(<CatalogPage />)} />
      <Route path="/books/:id" element={main(<BookDetailPage />)} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/login" element={main(<LoginPage />)} />
      <Route path="/register" element={main(<RegisterPage />)} />
      <Route path="/verify-email" element={main(<VerifyEmailPage />)} />
      <Route path="/forgot-password" element={main(<ForgotPasswordPage />)} />
      <Route path="/reset-password" element={main(<ResetPasswordPage />)} />
      <Route path="/cart" element={customerPage(<CartPage />)} />
      <Route path="/checkout" element={customerPage(<CheckoutPage />)} />
      <Route path="/payment/result" element={customerPage(<PaymentResultPage />)} />
      <Route path="/payment/success" element={customerPage(<PaymentResultPage />)} />
      <Route path="/payment/cancel" element={customerPage(<PaymentResultPage />)} />
      <Route path="/orders" element={customerPage(<OrdersPage />)} />
      <Route path="/orders/:id" element={customerPage(<OrderDetailPage />)} />
      <Route path="/books/chat" element={customerPage(<BookChatPage />)} />
      <Route path="/profile" element={protectedPage(<ProfilePage />)} />
      <Route path="/profile/addresses" element={protectedPage(<AddressesPage />)} />
      <Route path="/admin" element={admin(<AdminDashboardPage />)} />
      <Route path="/admin/categories" element={admin(<AdminCategoriesPage />)} />
      <Route path="/admin/books" element={admin(<AdminBooksPage />)} />
      <Route path="/admin/books/:id" element={admin(<AdminBookDetailPage />)} />
      <Route path="/admin/books/new" element={admin(<AdminAddBookPage />)} />
      <Route path="/admin/orders" element={admin(<AdminOrdersPage />)} />
      <Route path="/admin/orders/:id" element={admin(<AdminOrderDetailPage />)} />
      <Route path="/admin/vouchers" element={admin(<AdminVouchersPage />)} />
      <Route path="/admin/users" element={admin(<AdminUsersPage />)} />
      <Route path="/admin/reviews" element={admin(<AdminReviewsPage />)} />
      <Route path="/admin/inventory" element={admin(<AdminInventoryPage />)} />
      <Route path="/admin/rag" element={admin(<AdminRagPage />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
