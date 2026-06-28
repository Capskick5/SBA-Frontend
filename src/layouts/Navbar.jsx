import { useEffect, useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { cartService } from '../services/cartService';
import { CART_UPDATED_EVENT, getCartItemCount } from '../utils/cartEvents';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [cartItemCount, setCartItemCount] = useState(0);

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
    await logout();
    setCartItemCount(0);
    navigate('/');
  };

  return (
    <header className="navbar">
      <Link className="brand" to="/">BookVerse</Link>
      <nav className="nav-links">
        {(!user || user.role !== 'ADMIN') && (
          <NavLink className="cart-nav-link" to="/cart" aria-label={`Cart${cartItemCount ? `, ${cartItemCount} items` : ''}`}>
            <ShoppingCart size={20} aria-hidden="true" />
            {user && cartItemCount > 0 && <span className="cart-badge">{cartItemCount}</span>}
            <span className="sr-only">Cart</span>
          </NavLink>
        )}
        {user && user.role !== 'ADMIN' && <NavLink to="/orders">Orders</NavLink>}
        {user && user.role !== 'ADMIN' && <NavLink to="/books/chat">AI Chat</NavLink>}
        {user?.role === 'ADMIN' && <NavLink to="/admin">Admin</NavLink>}
        {user ? (
          <>
            <NavLink to="/profile">Profile</NavLink>
            <button type="button" onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <NavLink to={`/login?redirect=${encodeURIComponent(location.pathname)}`}>Login</NavLink>
            <NavLink to="/register">Register</NavLink>
          </>
        )}
      </nav>
    </header>
  );
}
