import { BookOpen, MapPin, Mail, Phone, Clock } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-brand">
          <Link className="footer-logo" to="/">
            <BookOpen size={28} />
            <span>BookVerse</span>
          </Link>
          <p className="footer-description">
            Khám phá thế giới tri thức bất tận cùng BookVerse. Chúng tôi cung cấp
            sách chất lượng cao thuộc nhiều thể loại và trải nghiệm đọc mượt mà
            cho mọi độc giả.
          </p>
          <div className="footer-socials">
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-social-btn"
              aria-label="Facebook"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
              </svg>
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-social-btn"
              aria-label="Twitter"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
              </svg>
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-social-btn"
              aria-label="Instagram"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-social-btn"
              aria-label="GitHub"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
              </svg>
            </a>
          </div>
        </div>

        <div className="footer-col">
          <h3>Khám phá</h3>
          <ul className="footer-links">
            <li>
              <Link to="/books">Tất cả sách</Link>
            </li>
            <li>
              <Link to="/genres">Danh mục sách</Link>
            </li>
            <li>
              <Link to="/about">Về chúng tôi</Link>
            </li>
            <li>
              <Link to="/blog">Tin tức & Sự kiện</Link>
            </li>
          </ul>
        </div>

        <div className="footer-col">
          <h3>Hỗ trợ</h3>
          <ul className="footer-links">
            <li>
              <Link to="/faqs">Câu hỏi thường gặp</Link>
            </li>
            <li>
              <Link to="/shipping">Chính sách vận chuyển</Link>
            </li>
            <li>
              <Link to="/privacy">Chính sách bảo mật</Link>
            </li>
            <li>
              <Link to="/terms">Điều khoản dịch vụ</Link>
            </li>
          </ul>
        </div>

        <div className="footer-col">
          <h3>Liên hệ</h3>
          <div className="footer-contact">
            <div className="footer-contact-item">
              <MapPin size={18} />
              <span>
                123 Đường Sách, Quận 1, TP. Hồ Chí Minh, Việt Nam
              </span>
            </div>
            <div className="footer-contact-item">
              <Mail size={18} />
              <a href="mailto:support@bookverse.com">support@bookverse.com</a>
            </div>
            <div className="footer-contact-item">
              <Phone size={18} />
              <a href="tel:+84123456789">+84 123 456 789</a>
            </div>
            <div className="footer-contact-item">
              <Clock size={18} />
              <span>Thứ Hai - Chủ Nhật / 8:00 - 22:00</span>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div>
          &copy; {new Date().getFullYear()} BookVerse. Bảo lưu mọi quyền.
        </div>
        <div className="footer-payments">
          <div className="payment-badge visa" title="Visa">
            <span className="visa-text">VISA</span>
          </div>

          <div className="payment-badge mastercard" title="Mastercard">
            <div className="mc-circle mc-red"></div>
            <div className="mc-circle mc-yellow"></div>
          </div>

          <div className="payment-badge momo" title="MoMo">
            <span className="momo-text">momo</span>
          </div>

          <div className="payment-badge vnpay" title="VNPAY">
            <span className="vnpay-text">
              <span className="vnpay-vn">VN</span>PAY
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
