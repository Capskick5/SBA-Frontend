import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Sparkles,
  ArrowRight,
  BookOpen,
  TrendingUp,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { bookService } from '../../services/bookService';

export default function CartEmptyState() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    let active = true;
    bookService
      .getCategories()
      .then((data) => {
        if (!active) return;
        const valid = (data || []).filter((c) => c.active !== false).slice(0, 4);
        setCategories(valid);
      })
      .catch(() => {
        if (active) setCategories([]);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="cart-empty-container">
      <div className="cart-empty-card">
        {/* Visual Hero Badge */}
        <div className="cart-empty-icon-wrapper">
          <div className="cart-empty-icon-bg" />
          <ShoppingBag className="cart-empty-main-icon" size={48} />
          <div className="cart-empty-sparkle-badge" title="BookVerse">
            <Sparkles size={16} />
          </div>
        </div>

        {/* Content Header */}
        <h2 className="cart-empty-title">Giỏ hàng của bạn đang trống</h2>
        <p className="cart-empty-desc">
          Có vẻ như bạn chưa chọn cuốn sách nào. Hãy khám phá hàng ngàn tựa sách hay và phong phú đang chờ đón bạn trên BookVerse!
        </p>

        {/* Primary CTA */}
        <button
          type="button"
          className="btn cart-empty-cta-btn"
          onClick={() => navigate('/')}
        >
          <BookOpen size={18} />
          Khám phá sách ngay
          <ArrowRight size={16} />
        </button>

        {/* Quick Discovery Pills */}
        <div className="cart-empty-suggestions">
          <span className="cart-empty-suggestions-label">Gợi ý khám phá nhanh</span>
          <div className="cart-empty-pills">
            <Link to="/" className="cart-empty-pill is-highlight">
              <BookOpen size={14} />
              Tất cả sách
            </Link>
            <Link to="/?sort=sold_desc" className="cart-empty-pill is-highlight">
              <TrendingUp size={14} />
              Bán chạy nhất
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/?category=${cat.id}`}
                className="cart-empty-pill"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Value Proposition Bar */}
        <div className="cart-empty-trust-bar">
          <div className="cart-empty-trust-item">
            <Truck size={16} className="cart-empty-trust-icon" />
            <span>Giao nhanh toàn quốc</span>
          </div>
          <div className="cart-empty-trust-divider" />
          <div className="cart-empty-trust-item">
            <ShieldCheck size={16} className="cart-empty-trust-icon" />
            <span>100% Sách chính hãng</span>
          </div>
        </div>
      </div>
    </div>
  );
}
