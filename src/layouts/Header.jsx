import { useEffect, useState, useRef } from 'react';
import { ShoppingCart, Sun, Moon, BookOpen, User, ShoppingBag, Shield, LogOut, ChevronDown } from 'lucide-react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { cartService } from '../services/cartService';
import { CART_UPDATED_EVENT, getCartItemCount } from '../utils/cartEvents';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [cartItemCount, setCartItemCount] = useState(0);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user || user.role === 'ADMIN') return undefined;

    let active = true;

    const loadCartCount = () => {
      cartService
        .getCart()
        .then((cart) => {
          if (active) setCartItemCount(getCartItemCount(cart));
        })
        .catch(() => {
          if (active) setCartItemCount(0);
        });
    };

    const handleCartUpdated = (event) => {
      if (typeof event.detail?.count === 'number') {
        setCartItemCount(event.detail.count);
      } else {
        loadCartCount();
      }
    };

    loadCartCount();
    window.addEventListener(CART_UPDATED_EVENT, handleCartUpdated);

    return () => {
      active = false;
      window.removeEventListener(CART_UPDATED_EVENT, handleCartUpdated);
    };
  }, [user, location.pathname]);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    setCartItemCount(0);
    navigate('/');
  };

  return (
    <header className="navbar">
      <Link className="brand" to="/">
        <BookOpen size={26} className="brand-icon" />
        <span>BookVerse</span>
      </Link>

      <nav className="nav-links">
        <NavLink to="/" end>
          Trang Chủ
        </NavLink>
        {user && user.role !== 'ADMIN' && (
          <NavLink to="/books/chat">
            AI Chat
          </NavLink>
        )}

        <div className="nav-controls">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="control-btn"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          {!isAuthPage && (!user || user.role !== 'ADMIN') && (
            <NavLink
              className="control-btn cart-btn"
              to="/cart"
              aria-label={`Cart${cartItemCount ? `, ${cartItemCount} items` : ''}`}
            >
              <ShoppingCart className="cart-icon" size={30} strokeWidth={2.4} aria-hidden="true" />
              {user && cartItemCount > 0 && <span className="cart-badge">{cartItemCount}</span>}
              <span className="sr-only">Cart</span>
            </NavLink>
          )}
        </div>

        {user ? (
          <div className="profile-dropdown-container" ref={dropdownRef}>
            <button
              type="button"
              className="profile-trigger"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <div className="avatar-circle">
                {user.fullName?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className="user-name">{user.fullName?.split(' ').pop()}</span>
              <ChevronDown size={14} className={`chevron-icon ${dropdownOpen ? 'rotated' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="dropdown-menu">
                <div className="dropdown-user-info">
                  <p className="user-info-name">{user.fullName}</p>
                  <p className="user-info-email">{user.email}</p>
                </div>
                <div className="dropdown-divider"></div>
                <Link to="/profile" onClick={() => setDropdownOpen(false)} className="dropdown-item">
                  <User size={16} />
                  <span>Trang cá nhân</span>
                </Link>
                {user.role !== 'ADMIN' && (
                  <Link to="/orders" onClick={() => setDropdownOpen(false)} className="dropdown-item">
                    <ShoppingBag size={16} />
                    <span>Đơn hàng của tôi</span>
                  </Link>
                )}
                {user.role === 'ADMIN' && (
                  <Link to="/admin" onClick={() => setDropdownOpen(false)} className="dropdown-item">
                    <Shield size={16} />
                    <span>Trang quản trị</span>
                  </Link>
                )}
                <div className="dropdown-divider"></div>
                <button type="button" onClick={handleLogout} className="dropdown-item logout-item">
                  <LogOut size={16} />
                  <span>Đăng xuất</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="auth-buttons">
            <Link to={`/login?redirect=${encodeURIComponent(location.pathname)}`} className="login-link">
              Đăng nhập
            </Link>
            <Link to="/register" className="register-btn">
              Đăng ký
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
