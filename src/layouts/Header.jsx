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
  TicketPercent,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { bookService } from "../services/bookService";
import { cartFacade } from "../services/cartFacade";
import { CART_UPDATED_EVENT, getCartItemCount } from "../utils/cartEvents";

const CATEGORY_NAV_LIMIT = 6;

function compactCategoryName(name) {
  const compactNames = {
    'Business & Finance': 'Tài chính',
    'Technology & Computing': 'Công nghệ',
    'Psychology & Self-Help': 'Phát triển bản thân',
    'Science & Mathematics': 'Khoa học',
    "Children's Books": 'Thiếu nhi',
    'History, Politics & International Relations': 'Lịch sử',
    'Fiction & Literature': 'Văn học',
    'Religion & Spirituality': 'Tâm linh',
    'Health & Fitness': 'Sức khỏe',
    'Education': 'Giáo dục',
    'Social Sciences': 'Xã hội',
  };

  return compactNames[name] || name.replace(/\s*&\s*/g, ' & ').split(':')[0];
}

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [cartItemCount, setCartItemCount] = useState(0);
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "light",
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [navCategories, setNavCategories] = useState([]);
  const dropdownRef = useRef(null);

  const searchParams = new URLSearchParams(location.search);
  const queryParam = searchParams.get("query") || "";
  const activeCategory = searchParams.get("category");
  const activeSort = searchParams.get("sort");
  const [searchQuery, setSearchQuery] = useState(queryParam);

  const isAuthPage =
    location.pathname === "/login" || location.pathname === "/register";

  const bottomLinks = [
    { label: "Tất cả sách", to: "/", isActive: location.pathname === "/" && !activeCategory && !queryParam && !activeSort },
    { label: "Bán chạy", to: "/?sort=sold_desc", isActive: activeSort === "sold_desc" },
    ...navCategories.map((category) => ({
      label: compactCategoryName(category.name),
      to: `/?category=${category.id}`,
      isActive: String(activeCategory) === String(category.id),
    })),
  ];

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

  useEffect(() => {
    Promise.resolve().then(() => setSearchQuery(queryParam));
  }, [queryParam]);

  useEffect(() => {
    let active = true;

    bookService
      .getCategories()
      .then((categories) => {
        if (!active) return;
        setNavCategories(
          (categories || [])
            .filter((category) => category.active !== false)
            .slice(0, CATEGORY_NAV_LIMIT),
        );
      })
      .catch(() => {
        if (active) setNavCategories([]);
      });

    return () => {
      active = false;
    };
  }, []);

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
    if (user?.role === "ADMIN") {
      return undefined;
    }

    let active = true;

    const loadCartCount = () => {
      cartFacade
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

  const visibleCartItemCount = user?.role === "ADMIN" ? 0 : cartItemCount;

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
            placeholder="Tìm kiếm sách, tác giả, ISBN"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-pill-input"
          />
          <button type="submit" className="search-pill-btn" aria-label="Tìm kiếm">
            <Search size={18} />
          </button>
        </form>

        {/* Right side controls / actions */}
        <div className="navbar-actions">
          {/* AI reading assistant link */}
          {(!user || user.role !== "ADMIN") && (
            <Link
              to={user ? "/books/chat" : "/login"}
              className="header-secondary-link"
              aria-label="Mở trợ lý đọc sách AI cho sách đã mua"
              title="Trợ lý đọc sách AI cho sách đã mua"
            >
              Trợ lý đọc sách AI
            </Link>
          )}

          {/* User Sign In / Account Dropdown */}
          {!user && (
            <Link
              to={`/login?redirect=${encodeURIComponent(location.pathname)}`}
              className="header-secondary-link"
            >
              Đăng nhập
            </Link>
          )}

          {/* Cart Control & Theme controls */}
          <div className="nav-controls">
            {!isAuthPage && (!user || user.role !== "ADMIN") && (
              <Link
                className="control-btn"
                to="/cart"
                aria-label={`Giỏ hàng${visibleCartItemCount ? `, ${visibleCartItemCount} sản phẩm` : ""}`}
              >
                <ShoppingBag size={20} aria-hidden="true" />
                {visibleCartItemCount > 0 && (
                  <span className="cart-badge">{visibleCartItemCount}</span>
                )}
              </Link>
            )}

            {user && (
              <div className="profile-dropdown-container" ref={dropdownRef}>
                <button
                  type="button"
                  className="control-btn profile-trigger-btn"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  aria-label="Hồ sơ người dùng"
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
                      <span>Thông tin tài khoản</span>
                    </Link>
                    {user.role !== "ADMIN" && (
                      <Link
                        to="/orders"
                        onClick={() => setDropdownOpen(false)}
                        className="dropdown-item"
                      >
                        <ShoppingBag size={16} />
                        <span>Đơn hàng của tôi</span>
                      </Link>
                    )}
                    {user.role !== "ADMIN" && (
                      <Link
                        to="/profile?tab=vouchers"
                        onClick={() => setDropdownOpen(false)}
                        className="dropdown-item"
                      >
                        <TicketPercent size={16} />
                        <span>Voucher của tôi</span>
                      </Link>
                    )}
                    {user.role !== "ADMIN" && (
                      <div className="dropdown-item dropdown-item-disabled">
                        <Crown size={16} />
                        <span>Thành viên</span>
                        <span className="dropdown-badge-soon">Sắp ra mắt</span>
                      </div>
                    )}
                    {user.role === "ADMIN" && (
                      <Link
                        to="/admin"
                        onClick={() => setDropdownOpen(false)}
                        className="dropdown-item"
                      >
                        <Shield size={16} />
                        <span>Bảng điều khiển quản trị</span>
                      </Link>
                    )}
                    <Link
                      to="/support"
                      onClick={() => setDropdownOpen(false)}
                      className="dropdown-item"
                    >
                      <HelpCircle size={16} />
                      <span>Trung tâm hỗ trợ</span>
                    </Link>
                    <div className="dropdown-divider"></div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="dropdown-item logout-item"
                    >
                      <LogOut size={16} />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Chuyển giao diện"
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
          {bottomLinks.map(({ label, to, isActive }) => (
            <Link key={label} to={to} className={isActive ? "active" : undefined}>
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
