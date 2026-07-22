import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TicketPercent } from 'lucide-react';
import Pagination from '../../components/catalog/Pagination';
import { ErrorState, LoadingState } from '../../components/ui/State';
import { voucherService } from '../../services/voucherService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

function formatVoucherDiscount(voucher) {
  if (voucher.discountType === 'PERCENTAGE') {
    return `Giảm ${voucher.discountValue}%`;
  }
  return `Giảm ${formatCurrency(voucher.discountValue)}`;
}

function formatVoucherDate(value) {
  return formatDateTime(value, 'Không có hạn sử dụng');
}

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

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
          if (active) setLoadError(err.message || 'Không thể tải voucher.');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      });

    return () => {
      active = false;
    };
  }, [page, reloadKey]);

  if (loading) return <LoadingState text="Đang tải voucher của bạn..." />;
  if (loadError) return <ErrorState text={loadError}><button className="btn" onClick={() => setReloadKey((value) => value + 1)}>Thử lại</button></ErrorState>;

  return (
    <section className="voucher-wallet">
      <div className="voucher-wallet-hero">
        <div className="voucher-wallet-icon">
          <TicketPercent size={28} />
        </div>
        <div>
          <h2>Voucher của tôi</h2>
          <p>
            Voucher được tặng sau các đơn hàng đủ điều kiện đã thanh toán. Sử dụng voucher
            khi thanh toán lần tiếp theo trước khi tiến hành thanh toán.
          </p>
          <span className="voucher-wallet-count">{totalItems} voucher khả dụng</span>
        </div>
      </div>

      {vouchers.length > 0 ? (
        <>
          <div className="voucher-wallet-grid">
            {vouchers.map((voucher) => (
            <article className="voucher-wallet-card" key={voucher.id}>
              <div className="voucher-card-main">
                <span className="voucher-card-label">Voucher khả dụng</span>
                <strong>{formatVoucherDiscount(voucher)}</strong>
                <p>{voucher.name}</p>
              </div>
              <div className="voucher-card-code">
                <span>Mã voucher</span>
                <strong>{voucher.code}</strong>
              </div>
              <dl className="voucher-card-details">
                <div>
                  <dt>Tổng phụ tối thiểu</dt>
                  <dd>{formatCurrency(voucher.tierMinAmount)}</dd>
                </div>
                <div>
                  <dt>Hết hạn</dt>
                  <dd>{formatVoucherDate(voucher.expiresAt)}</dd>
                </div>
              </dl>
              <Link className="voucher-use-link" to="/cart">
                Dùng khi thanh toán
              </Link>
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
          <h2>Chưa có voucher</h2>
          <p>
            Hoàn tất thanh toán đơn hàng trước. Nếu đơn hàng đủ điều kiện, voucher sẽ xuất hiện
            tại đây và có thể được chọn khi thanh toán lần tiếp theo.
          </p>
          <Link to="/orders">Xem đơn hàng của tôi</Link>
        </div>
      )}
    </section>
  );
}
