import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TicketPercent, Search, Copy, ShoppingBag } from 'lucide-react';
import Pagination from '../../components/catalog/Pagination';
import { ErrorState, LoadingState } from '../../components/ui/State';
import { voucherService } from '../../services/voucherService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { showToast } from '../../utils/toast';

function formatDiscount({ discountType, discountValue, maxDiscountAmount }) {
  if (discountType === 'PERCENTAGE') {
    const cap = maxDiscountAmount ? ` (Tối đa ${formatCurrency(maxDiscountAmount)})` : '';
    return `Giảm ${discountValue}%${cap}`;
  }
  return `Giảm ${formatCurrency(discountValue)}`;
}

function formatDate(value) {
  return formatDateTime(value, 'Không giới hạn');
}

const STATUS_LABEL = {
  UNUSED: 'Sẵn sàng dùng',
  USED: 'Đã sử dụng',
  EXPIRED: 'Đã hết hạn',
};

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const reloadAll = () => setReloadKey((value) => value + 1);

  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    showToast(`Đã sao chép mã "${code}"!`, 'success');
  };

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      setLoading(true);
      setLoadError('');
      return voucherService
        .getMinePage({ page, size: 6 })
        .then((result) => {
          if (!active) return;
          setVouchers(result.items || []);
          setTotalPages(result.totalPages || 0);
          setTotalItems(result.totalItems || 0);
        })
        .catch((err) => {
          if (active) setLoadError(err?.response?.data?.message || err.message || 'Không thể tải danh sách voucher.');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    });
    return () => {
      active = false;
    };
  }, [page, reloadKey]);

  return (
    <section className="voucher-wallet">
      {/* Clean Standard Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Ví voucher của tôi</h1>
          <p className="page-subtitle" style={{ margin: '4px 0 0 0' }}>
            Danh sách mã giảm giá bạn đã thu thập. Áp dụng mã khi tiến hành đặt hàng thanh toán.
          </p>
        </div>
        <span className="voucher-wallet-count">{totalItems} mã trong ví</span>
      </div>

      {loading ? (
        <LoadingState text="Đang tải danh sách mã giảm giá..." />
      ) : loadError ? (
        <ErrorState text={loadError}>
          <button className="btn" onClick={reloadAll}>Thử lại</button>
        </ErrorState>
      ) : vouchers.length > 0 ? (
        <>
          <div className="voucher-wallet-grid">
            {vouchers.map((voucher) => (
              <article
                className={`voucher-ticket-card ${voucher.status !== 'UNUSED' ? 'is-disabled' : ''}`}
                key={voucher.id}
              >
                <div className="ticket-left">
                  <div className="ticket-badge-wrap">
                    <span className={`ticket-badge status-${(voucher.status || 'UNUSED').toLowerCase()}`}>
                      {STATUS_LABEL[voucher.status] || voucher.status}
                    </span>
                  </div>
                  <h3 className="ticket-discount">{formatDiscount(voucher)}</h3>
                  <p className="ticket-name">{voucher.voucherName || 'Voucher giảm giá BookVerse'}</p>
                  <div className="ticket-meta">
                    <span>Đơn tối thiểu: <strong>{formatCurrency(voucher.minOrderValue)}</strong></span>
                    <span>HSD: <strong>{formatDate(voucher.expiresAt)}</strong></span>
                  </div>
                </div>

                <div className="ticket-divider">
                  <div className="notch notch-top"></div>
                  <div className="dashed-line"></div>
                  <div className="notch notch-bottom"></div>
                </div>

                <div className="ticket-right">
                  <div className="ticket-code-box">
                    <span className="code-label">MÃ VOUCHER</span>
                    <strong className="code-value">{voucher.voucherCode}</strong>
                  </div>
                  <div className="ticket-actions">
                    <button
                      type="button"
                      className="btn-copy-code"
                      onClick={() => handleCopyCode(voucher.voucherCode)}
                      title="Sao chép mã"
                    >
                      <Copy size={12} /> Copy
                    </button>
                    {voucher.status === 'UNUSED' ? (
                      <Link className="btn-use-voucher" to="/cart">
                        Dùng ngay
                      </Link>
                    ) : (
                      <span className="btn-use-voucher disabled">
                        {STATUS_LABEL[voucher.status] || voucher.status}
                      </span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
          <Pagination
            currentPage={page + 1}
            totalPages={totalPages}
            onPageChange={(nextPage) => setPage(nextPage - 1)}
          />
        </>
      ) : (
        <div className="voucher-empty-card">
          <TicketPercent size={34} style={{ color: 'var(--accent)', opacity: 0.8 }} />
          <h2>Chưa có mã giảm giá nào trong ví</h2>
          <p>Hãy lướt Trang chủ và bấm "Thu thập voucher" tại các chương trình khuyến mãi để tự động nhận mã ưu đãi vào ví!</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: '8px', display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
            <Search size={16} /> Thu thập voucher ở Trang chủ
          </Link>
        </div>
      )}
    </section>
  );
}
