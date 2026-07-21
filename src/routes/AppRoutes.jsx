import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AdminLayout from '../layouts/AdminLayout';
import { AdminRoute, CustomerRoute, GuestOrCustomerRoute, ProtectedRoute, StorefrontRoute } from './RouteGuards';
import { LoadingState } from '../components/ui/State';

const CatalogPage = lazy(() => import('../pages/catalog/CatalogPage'));
const BookDetailPage = lazy(() => import('../pages/catalog/BookDetailPage'));
const BookChatPage = lazy(() => import('../pages/catalog/BookChatPage'));
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const AdminLoginPage = lazy(() => import('../pages/auth/AdminLoginPage'));
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage'));
const VerifyEmailPage = lazy(() => import('../pages/auth/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../pages/auth/ResetPasswordPage'));
const CartPage = lazy(() => import('../pages/cart/CartPage'));
const CheckoutPage = lazy(() => import('../pages/checkout/CheckoutPage'));
const PaymentResultPage = lazy(() => import('../pages/payment/PaymentResultPage'));
const OrdersPage = lazy(() => import('../pages/orders/OrdersPage'));
const OrderDetailPage = lazy(() => import('../pages/orders/OrderDetailPage'));
const ProfilePage = lazy(() => import('../pages/profile/ProfilePage'));
const AddressesPage = lazy(() => import('../pages/profile/AddressesPage'));
const AdminDashboardPage = lazy(() => import('../pages/admin/AdminDashboardPage'));
const AdminBooksPage = lazy(() => import('../pages/admin/AdminBooksPage'));
const AdminBookDetailPage = lazy(() => import('../pages/admin/AdminBookDetailPage'));
const AdminCategoriesPage = lazy(() => import('../pages/admin/AdminCategoriesPage'));
const AdminOrdersPage = lazy(() => import('../pages/admin/AdminOrdersPage'));
const AdminOrderDetailPage = lazy(() => import('../pages/admin/AdminOrderDetailPage'));
const AdminUsersPage = lazy(() => import('../pages/admin/AdminUsersPage'));
const AdminReviewsPage = lazy(() => import('../pages/admin/AdminReviewsPage'));
const AdminAddBookPage = lazy(() => import('../pages/admin/AdminAddBookPage'));
const AdminRagPage = lazy(() => import('../pages/admin/AdminRagPage'));
const AdminInventoryPage = lazy(() => import('../pages/admin/AdminInventoryPage'));
const AdminVouchersPage = lazy(() => import('../pages/admin/AdminVouchersPage'));
const AdminBannersPage = lazy(() => import('../pages/admin/AdminBannersPage'));
const AdminGiftWrapFeePage = lazy(() => import('../pages/admin/AdminGiftWrapFeePage'));
const AdminRefundsPage = lazy(() => import('../pages/admin/AdminRefundsPage'));

const main = (page) => (
  <StorefrontRoute>
    <MainLayout>{page}</MainLayout>
  </StorefrontRoute>
);
const protectedPage = (page) => main(<ProtectedRoute>{page}</ProtectedRoute>);
const customerPage = (page) => main(<CustomerRoute>{page}</CustomerRoute>);
const guestOrCustomerPage = (page) => main(<GuestOrCustomerRoute>{page}</GuestOrCustomerRoute>);
const admin = (page) => (
  <AdminRoute>
    <AdminLayout>{page}</AdminLayout>
  </AdminRoute>
);

export default function AppRoutes() {
  return (
    <Suspense fallback={<LoadingState text="Loading page..." />}>
      <Routes>
        <Route path="/" element={main(<CatalogPage />)} />
        <Route path="/books/:id" element={main(<BookDetailPage />)} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/login" element={main(<LoginPage />)} />
        <Route path="/register" element={main(<RegisterPage />)} />
        <Route path="/verify-email" element={main(<VerifyEmailPage />)} />
        <Route path="/forgot-password" element={main(<ForgotPasswordPage />)} />
        <Route path="/reset-password" element={main(<ResetPasswordPage />)} />
        <Route path="/cart" element={guestOrCustomerPage(<CartPage />)} />
        <Route path="/checkout" element={guestOrCustomerPage(<CheckoutPage />)} />
        <Route path="/payment/result" element={guestOrCustomerPage(<PaymentResultPage />)} />
        <Route path="/payment/success" element={guestOrCustomerPage(<PaymentResultPage />)} />
        <Route path="/payment/cancel" element={guestOrCustomerPage(<PaymentResultPage />)} />
        <Route path="/orders" element={customerPage(<OrdersPage />)} />
        <Route path="/orders/:id" element={main(<OrderDetailPage />)} />
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
        <Route path="/admin/refunds" element={admin(<AdminRefundsPage />)} />
        <Route path="/admin/vouchers" element={admin(<AdminVouchersPage />)} />
        <Route path="/admin/banners" element={admin(<AdminBannersPage />)} />
        <Route path="/admin/gift-wrap-fee" element={admin(<AdminGiftWrapFeePage />)} />
        <Route path="/admin/users" element={admin(<AdminUsersPage />)} />
        <Route path="/admin/reviews" element={admin(<AdminReviewsPage />)} />
        <Route path="/admin/inventory" element={admin(<AdminInventoryPage />)} />
        <Route path="/admin/rag" element={admin(<AdminRagPage />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
