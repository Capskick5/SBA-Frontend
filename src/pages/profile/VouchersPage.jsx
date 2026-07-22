import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TicketPercent, Search } from 'lucide-react';
import Pagination from '../../components/catalog/Pagination';
import { ErrorState, LoadingState } from '../../components/ui/State';
import { voucherService } from '../../services/voucherService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

function formatDiscount({ discountType, discountValue, maxDiscountAmount }) {
  if (discountType === 'PERCENTAGE') {
    const cap = maxDiscountAmount ? ` (Giảm tối đa ${formatCurrency(maxDiscountAmount)})` : '';
    return `Giảm ${discountValue}%${cap}`;
  }
  return `Giảm ${formatCurrency(discountValue)}`;
}

function formatDate(value) {
  return formatDateTime(value, 'Không giới hạn thời gian');
}

const STATUS_LABEL = {
  UNUSED: 'Sẵn sàng sử dụng',
  USED: 'Đã sử dụng',
  EXPIRED: 'Đã hết hạn',
};

export default function VouchersPage() {
  // My claimed vouchers (wallet)
  const [vouchers, setVouchers] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const reloadAll = () => setReloadKey((value) => value + 1);

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
      {/* My wallet */}
      <div className="voucher-wallet-hero">
        <div className="voucher-wallet-icon">
          <TicketPercent size={28} />
        </div>
        <div>
          <h2>Ví voucher của tôi</h2>
          <p>Danh sách mã giảm giá bạn đã thu thập từ Trang chủ. Áp dụng mã khi tiến hành đặt hàng thanh toán.</p>
          <span className="voucher-wallet-count">{totalItems} mã trong ví</span>
        </div>
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
                className="voucher-wallet-card"
                key={voucher.id}
                style={voucher.status !== 'UNUSED' ? { opacity: 0.6 } : undefined}
              >
                <div className="voucher-card-main">
                  <span className="voucher-card-label">{STATUS_LABEL[voucher.status] || voucher.status}</span>
                  <strong>{formatDiscount(voucher)}</strong>
                  <p>{voucher.voucherName}</p>
                </div>
                <div className="voucher-card-code">
                  <span>Mã voucher</span>
                  <strong>{voucher.voucherCode}</strong>
                </div>
                <dl className="voucher-card-details">
                  <div>
                    <dt>Đơn tối thiểu</dt>
                    <dd>{formatCurrency(voucher.minOrderValue)}</dd>
                  </div>
                  <div>
                    <dt>Hạn sử dụng</dt>
                    <dd>{formatDate(voucher.expiresAt)}</dd>
                  </div>
                </dl>
                {voucher.status === 'UNUSED' ? (
                  <Link className="voucher-use-link" to="/cart">
                    Sử dụng ngay khi thanh toán
                  </Link>
                ) : (
                  <span className="voucher-use-link" style={{ pointerEvents: 'none', opacity: 0.7 }}>
                    {STATUS_LABEL[voucher.status] || voucher.status}
                  </span>
                )}
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
          <TicketPercent size={34} />
          <h2>Chưa có mã giảm giá nào trong ví</h2>
          <p>Hãy lướt Trang chủ và bấm "Thu thập voucher" tại các chương trình khuyến mãi để tự động nhận mã vào ví!</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: '12px', display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
            <Search size={16} /> Bấm thu thập voucher ở Trang chủ
          </Link>
        </div>
      )}
    </section>
  );
}
