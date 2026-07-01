import { useEffect, useState, useRef } from "react";
import {
  Sun,
  Moon,
  BookOpen,
  User,
  ShoppingBag,
  Shield,
  LogOut,
  Search,
  HelpCircle,
  Crown,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { cartService } from "../services/cartService";
import { CART_UPDATED_EVENT, getCartItemCount } from "../utils/cartEvents";

const bottomLinks = [
  { label: "New Books", to: "/?sort=rating_desc" },
  { label: "Ebooks", to: "/?query=ebook" },
  { label: "Best Sellers", to: "/?sort=rating_desc" },
  { label: "Pre-Order Offers", to: "/?query=pre-order" },
  { label: "Kids", to: "/?query=kids" },
  { label: "Fiction ▾", to: "/?query=fiction" },
  { label: "Nonfiction ▾", to: "/?query=nonfiction" },
  { label: "YA", to: "/?query=ya" },
  { label: "Games & Puzzles", to: "/?query=games" },
  { label: "Stationery & Gifts", to: "/?query=stationery" },
  { label: "Gift Cards", to: "/?query=gift" },
  { label: "Offers ▾", to: "/?query=offer" },
];

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [cartItemCount, setCartItemCount] = useState(0);
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "light",
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const queryParam = new URLSearchParams(location.search).get("query") || "";
  const [searchQuery, setSearchQuery] = useState(queryParam);

  const isAuthPage =
    location.pathname === "/login" || location.pathname === "/register";

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

  useEffect(() => {
    setSearchQuery(queryParam);
  }, [queryParam]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user || user.role === "ADMIN") return undefined;

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
      if (typeof event.detail?.count === "number") {
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
    navigate("/");
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?query=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate("/");
    }
  };

  return (
    <header className="navbar">
      {/* Top Row */}
      <div className="navbar-top-row">
        <Link className="brand" to="/">
          <BookOpen size={26} className="brand-icon" />
          <span>BookVerse</span>
        </Link>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="search-form-pill">
          <input
            type="text"
            placeholder="Search books, authors, ISBNs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-pill-input"
          />
          <button type="submit" className="search-pill-btn" aria-label="Search">
            <Search size={18} />
          </button>
        </form>

        {/* Right side controls / actions */}
        <div className="navbar-actions">
          {/* AI Bookstore Link */}
          {(!user || user.role !== "ADMIN") && (
            <Link
              to={user ? "/books/chat" : "/login"}
              className="header-secondary-link"
            >
              Choose a Bookstore
            </Link>
          )}

          {/* User Sign In / Account Dropdown */}
          {!user && (
            <Link
              to={`/login?redirect=${encodeURIComponent(location.pathname)}`}
              className="header-secondary-link"
            >
              Sign In
            </Link>
          )}

          {/* Cart Control & Theme controls */}
          <div className="nav-controls">
            {!isAuthPage && (!user || user.role !== "ADMIN") && (
              <Link
                className="control-btn"
                to="/cart"
                aria-label={`Cart${cartItemCount ? `, ${cartItemCount} items` : ""}`}
              >
                <ShoppingBag size={20} aria-hidden="true" />
                {user && cartItemCount > 0 && (
                  <span className="cart-badge">{cartItemCount}</span>
                )}
              </Link>
            )}

            {user && (
              <div className="profile-dropdown-container" ref={dropdownRef}>
                <button
                  type="button"
                  className="control-btn profile-trigger-btn"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  aria-label="User profile"
                >
                  <User size={20} />
                </button>

                {dropdownOpen && (
                  <div className="dropdown-menu">
                    <div className="dropdown-user-info">
                      <p className="user-info-name">{user.fullName}</p>
                    </div>
                    <div className="dropdown-divider"></div>
                    <Link
                      to="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="dropdown-item"
                    >
                      <User size={16} />
                      <span>Account Information</span>
                    </Link>
                    {user.role !== "ADMIN" && (
                      <Link
                        to="/orders"
                        onClick={() => setDropdownOpen(false)}
                        className="dropdown-item"
                      >
                        <ShoppingBag size={16} />
                        <span>My Orders</span>
                      </Link>
                    )}
                    {user.role !== "ADMIN" && (
                      <div className="dropdown-item dropdown-item-disabled">
                        <Crown size={16} />
                        <span>Membership</span>
                        <span className="dropdown-badge-soon">Soon</span>
                      </div>
                    )}
                    {user.role === "ADMIN" && (
                      <Link
                        to="/admin"
                        onClick={() => setDropdownOpen(false)}
                        className="dropdown-item"
                      >
                        <Shield size={16} />
                        <span>Admin Dashboard</span>
                      </Link>
                    )}
                    <Link
                      to="/support"
                      onClick={() => setDropdownOpen(false)}
                      className="dropdown-item"
                    >
                      <HelpCircle size={16} />
                      <span>Support Center</span>
                    </Link>
                    <div className="dropdown-divider"></div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="dropdown-item logout-item"
                    >
                      <LogOut size={16} />
                      <span>Log Out</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="control-btn"
            >
              {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Navigation Row */}
      <div className="navbar-bottom-row">
        <nav className="navbar-bottom-links">
          {bottomLinks.map(({ label, to }) => (
            <Link key={label} to={to}>
              {label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Alert Bar */}
      <div className="navbar-alert-bar">
        <span>$18,655,083.19 Raised for Local Bookstores ⓘ</span>
      </div>
    </header>
  );
}
