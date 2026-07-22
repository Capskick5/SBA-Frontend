import { BookOpen, Mail, Phone, Clock } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-brand">
          <Link className="footer-logo" to="/">
            <BookOpen size={26} />
            <span>BookVerse</span>
          </Link>
          <p className="footer-description">
            Nền tảng mua sắm sách trực tuyến hàng đầu. Cung cấp hàng ngàn tựa sách chất lượng với trải nghiệm mua sắm mượt mà.
          </p>
        </div>

        <div className="footer-col">
          <h3>Khám phá</h3>
          <ul className="footer-links">
            <li>
              <Link to="/books">Tất cả sách</Link>
            </li>
            <li>
              <Link to="/about">Về chúng tôi</Link>
            </li>
          </ul>
        </div>

        <div className="footer-col">
          <h3>Liên hệ & Hỗ trợ</h3>
          <div className="footer-contact">
            <div className="footer-contact-item">
              <Mail size={16} />
              <a href="mailto:support@bookverse.com">support@bookverse.com</a>
            </div>
            <div className="footer-contact-item">
              <Phone size={16} />
              <a href="tel:+84123456789">+84 123 456 789</a>
            </div>
            <div className="footer-contact-item">
              <Clock size={16} />
              <span>Thứ Hai - Chủ Nhật / 8:00 - 22:00</span>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div>
          &copy; {new Date().getFullYear()} BookVerse. Tất cả quyền được bảo lưu.
        </div>
      </div>
    </footer>
  );
}
