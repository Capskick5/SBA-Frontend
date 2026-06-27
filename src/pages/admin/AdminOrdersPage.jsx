import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import OrderStatusBadge from '../../components/orders/OrderStatusBadge';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import { adminService } from '../../services/adminService';
import { formatCurrency } from '../../utils/formatters';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('id,desc');

  const loadOrders = (pageIndex, currentSort) => {
    adminService.getOrders({ page: pageIndex, size: 10, sort: currentSort })
      .then((page) => {
        setOrders(page.items || []);
        setTotalPages(page.totalPages || 1);
      })
      .catch((err) => {
        console.error('Lỗi lấy danh sách đơn hàng:', err);
        setOrders([]);
        setTotalPages(1);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOrders(currentPage, sortBy);
  }, [currentPage, sortBy]);

  return (
    <section className="stack">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Quản lý Đơn hàng</h1>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <label htmlFor="sortOrders" style={{ fontWeight: 'bold' }}>Sắp xếp:</label>
          <select
            id="sortOrders"
            value={sortBy}
            onChange={(event) => {
              setSortBy(event.target.value);
              setCurrentPage(0);
            }}
            style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="id,desc">Mã đơn: Mới nhất</option>
            <option value="id,asc">Mã đơn: Cũ nhất</option>
            <option value="total,desc">Giá trị: Cao đến thấp</option>
            <option value="total,asc">Giá trị: Thấp đến cao</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p>Đang tải dữ liệu đơn hàng...</p>
      ) : (
        <>
          <Table
            columns={[
              { key: 'id', label: 'Mã đơn' },
              { key: 'userId', label: 'Khách hàng', render: (row) => row.userId || 'N/A' },
              {
                key: 'createdAt',
                label: 'Ngày đặt',
                render: (row) => (row.createdAt ? new Date(row.createdAt).toLocaleDateString('vi-VN') : 'N/A'),
              },
              { key: 'status', label: 'Trạng thái', render: (row) => <OrderStatusBadge status={row.status} /> },
              { key: 'total', label: 'Tổng tiền', render: (row) => <strong style={{ color: '#e53e3e' }}>{formatCurrency(row.total)}</strong> },
              { key: 'action', label: 'Hành động', render: (row) => <Link to={`/admin/orders/${row.id}`} className="btn-link">Chi tiết</Link> },
            ]}
            rows={orders}
          />

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '20px' }}>
            <Button type="button" disabled={currentPage === 0} onClick={() => setCurrentPage((prev) => prev - 1)}>
              &laquo; Trang trước
            </Button>
            <span style={{ fontWeight: 'bold' }}>
              Trang {currentPage + 1} / {totalPages}
            </span>
            <Button type="button" disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage((prev) => prev + 1)}>
              Trang sau &raquo;
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
