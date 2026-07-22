import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import OrderStatusBadge from '../../components/orders/OrderStatusBadge';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import AdminPagination from '../../components/ui/AdminPagination';
import { ErrorState, LoadingState } from '../../components/ui/State';
import { adminService } from '../../services/adminService';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('id,desc');

  const loadOrders = (pageIndex, currentSort) => {
    setLoading(true);
    setError(null);
    adminService.getOrders({ page: pageIndex, size: 10, sort: currentSort })
      .then((res) => {
        const responseBody = res.data || res;
        if (responseBody?.data?.items && Array.isArray(responseBody.data.items)) {
          setOrders(responseBody.data.items);
          setTotalPages(responseBody.data.totalPages || 1);
        } else if (responseBody?.items && Array.isArray(responseBody.items)) {
          setOrders(responseBody.items);
          setTotalPages(responseBody.totalPages || 1);
        } else {
          setOrders([]);
          setTotalPages(1);
        }
      })
      .catch((err) => {
        console.error('Failed to load orders:', err);
        setError('Không thể tải đơn hàng. Vui lòng thử lại sau.');
        setOrders([]);
        setTotalPages(1);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    Promise.resolve().then(() => loadOrders(currentPage, sortBy));
  }, [currentPage, sortBy]);

  return (
    <section className="stack">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Quản lý đơn hàng</h1>
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
            <option value="id,desc">Mã đơn: Mới nhất trước</option>
            <option value="id,asc">Mã đơn: Cũ nhất trước</option>
            <option value="total,desc">Giá trị: Cao đến thấp</option>
            <option value="total,asc">Giá trị: Thấp đến cao</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingState text="Đang tải đơn hàng..." />
      ) : error ? (
        <ErrorState text={error}>
          <Button onClick={() => loadOrders(currentPage, sortBy)}>Thử lại</Button>
        </ErrorState>
      ) : (
        <>
          <Table
            emptyText="Không tìm thấy đơn hàng nào."
            columns={[
              { key: 'id', label: 'Mã đơn' },
              {
                key: 'userId',
                label: 'Khách hàng',
                render: (row) => (
                  row.userId
                    ? `#${row.userId}`
                    : (row.guestEmail ? `Khách · ${row.guestEmail}` : 'Khách')
                ),
              },
              {
                key: 'createdAt',
                label: 'Ngày đặt',
                render: (row) => formatDate(row.createdAt),
              },
              { key: 'status', label: 'Trạng thái', render: (row) => <OrderStatusBadge status={row.status} /> },
              { key: 'total', label: 'Tổng tiền', render: (row) => <strong style={{ color: '#e53e3e' }}>{formatCurrency(row.total)}</strong> },
              {
                key: 'action',
                label: 'Thao tác',
                render: (row) => (
                  <div className="admin-row-actions">
                    <Link to={`/admin/orders/${row.id}`} className="btn btn-secondary btn-sm">
                      Xem
                    </Link>
                  </div>
                ),
              },
            ]}
            rows={orders}
          />

          {orders.length > 0 && (
            <AdminPagination
              page={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}
    </section>
  );
}
