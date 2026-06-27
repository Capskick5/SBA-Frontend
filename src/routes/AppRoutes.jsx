import { Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AdminLayout from '../layouts/AdminLayout';
import { AdminRoute, ProtectedRoute } from './RouteGuards';
import CatalogPage from '../pages/catalog/CatalogPage';
import BookDetailPage from '../pages/catalog/BookDetailPage';
import LoginPage from '../pages/auth/LoginPage';
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
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import AdminBooksPage from '../pages/admin/AdminBooksPage';
import AdminBookDetailPage from '../pages/admin/AdminBookDetailPage';
import AdminCategoriesPage from '../pages/admin/AdminCategoriesPage';
import AdminOrdersPage from '../pages/admin/AdminOrdersPage';
import AdminOrderDetailPage from '../pages/admin/AdminOrderDetailPage';
import AdminUsersPage from '../pages/admin/AdminUsersPage';
import AdminReviewsPage from '../pages/admin/AdminReviewsPage';
import AdminAddBookPage from '../pages/admin/AdminAddBookPage';

const main = (page) => <MainLayout>{page}</MainLayout>;
const protectedPage = (page) => main(<ProtectedRoute>{page}</ProtectedRoute>);
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
      <Route path="/login" element={main(<LoginPage />)} />
      <Route path="/register" element={main(<RegisterPage />)} />
      <Route path="/verify-email" element={main(<VerifyEmailPage />)} />
      <Route path="/forgot-password" element={main(<ForgotPasswordPage />)} />
      <Route path="/reset-password" element={main(<ResetPasswordPage />)} />
      <Route path="/cart" element={protectedPage(<CartPage />)} />
      <Route path="/checkout" element={protectedPage(<CheckoutPage />)} />
      <Route path="/payment/result" element={protectedPage(<PaymentResultPage />)} />
      <Route path="/orders" element={protectedPage(<OrdersPage />)} />
      <Route path="/orders/:id" element={protectedPage(<OrderDetailPage />)} />
      <Route path="/profile" element={protectedPage(<ProfilePage />)} />
      <Route path="/profile/addresses" element={protectedPage(<AddressesPage />)} />
      <Route path="/admin" element={admin(<AdminDashboardPage />)} />
      <Route path="/admin/categories" element={admin(<AdminCategoriesPage />)} />
      <Route path="/admin/books" element={admin(<AdminBooksPage />)} />
      <Route path="/admin/books/:id" element={admin(<AdminBookDetailPage />)} />
      <Route path="/admin/books/new" element={admin(<AdminAddBookPage />)} />
      <Route path="/admin/orders" element={admin(<AdminOrdersPage />)} />
      <Route path="/admin/orders/:id" element={admin(<AdminOrderDetailPage />)} />
      <Route path="/admin/users" element={admin(<AdminUsersPage />)} />
      <Route path="/admin/reviews" element={admin(<AdminReviewsPage />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}