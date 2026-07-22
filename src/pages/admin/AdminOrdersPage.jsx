import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import OrderStatusBadge from '../../components/orders/OrderStatusBadge';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import AdminPagination from '../../components/ui/AdminPagination';
import AdminPageHeader from '../../components/ui/AdminPageHeader';
import AdminToolbar, { AdminFilterField } from '../../components/ui/AdminToolbar';
import { ErrorState, LoadingState } from '../../components/ui/State';
import { adminService } from '../../services/adminService';
import { formatCurrency, formatDate } from '../../utils/formatters';

const PAGE_SIZE = 10;

/** Lower number = higher priority in the default admin queue. */
const ORDER_STATUS_PRIORITY = {
  PENDING_PAYMENT: 1,
  PENDING: 1,
  PAID: 2,
  PROCESSING: 3,
  PACKED: 4,
  SHIPPED: 5,
  RE_DELIVERY: 5,
  PAYMENT_FAILED: 6,
  REFUND_REQUESTED: 6,
  DELIVERED: 8,
  REFUNDED: 9,
  CANCELLED: 10,
};

function getOrderPriority(status) {
  return ORDER_STATUS_PRIORITY[status] ?? 7;
}

function compareByPriority(a, b) {
  const priorityDiff = getOrderPriority(a.status) - getOrderPriority(b.status);
  if (priorityDiff !== 0) return priorityDiff;
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

function extractOrdersPage(res) {
  const responseBody = res?.data || res;
  if (responseBody?.data?.items && Array.isArray(responseBody.data.items)) {
    return {
      items: responseBody.data.items,
      totalPages: responseBody.data.totalPages || 1,
    };
  }
  if (responseBody?.items && Array.isArray(responseBody.items)) {
    return {
      items: responseBody.items,
      totalPages: responseBody.totalPages || 1,
    };
  }
  return { items: [], totalPages: 1 };
}

export default function AdminOrdersPage() {
  const [serverOrders, setServerOrders] = useState([]);
  const [priorityOrders, setPriorityOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('priority');

  const loadOrders = (pageIndex, currentSort) => {
    setLoading(true);
    setError(null);

    const isPriority = currentSort === 'priority';
    const request = isPriority
      ? adminService.getOrders({ page: 0, size: 200, sort: 'createdAt,asc' })
      : adminService.getOrders({ page: pageIndex, size: PAGE_SIZE, sort: currentSort });

    request
      .then((res) => {
        const { items, totalPages: pages } = extractOrdersPage(res);
        if (isPriority) {
          const sorted = [...items].sort(compareByPriority);
          setPriorityOrders(sorted);
          setServerOrders([]);
          setTotalPages(Math.max(1, Math.ceil(sorted.length / PAGE_SIZE)));
        } else {
          setPriorityOrders([]);
          setServerOrders(items);
          setTotalPages(pages || 1);
        }
      })
      .catch((err) => {
        console.error('Failed to load orders:', err);
        setError('Không thể tải đơn hàng. Vui lòng thử lại sau.');
        setServerOrders([]);
        setPriorityOrders([]);
        setTotalPages(1);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (sortBy !== 'priority') return;
    loadOrders(0, 'priority');
  }, [sortBy]);

  useEffect(() => {
    if (sortBy === 'priority') return;
    loadOrders(currentPage, sortBy);
  }, [currentPage, sortBy]);

  const visibleOrders = useMemo(() => {
    if (sortBy === 'priority') {
      return priorityOrders.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
    }
    return serverOrders;
  }, [sortBy, priorityOrders, serverOrders, currentPage]);

  useEffect(() => {
    if (sortBy !== 'priority') return;
    const pages = Math.max(1, Math.ceil(priorityOrders.length / PAGE_SIZE) || 1);
    setTotalPages(pages);
    const maxPage = Math.max(0, pages - 1);
    if (currentPage > maxPage) setCurrentPage(maxPage);
  }, [sortBy, priorityOrders, currentPage]);

  return (
    <section className="stack">
      <AdminPageHeader
        title="Quản lý đơn hàng"
        subtitle="Ưu tiên đơn chờ xử lý và đang trong tiến trình trước đơn đã giao / đã hủy."
      />

      <AdminToolbar>
        <AdminFilterField label="Sắp xếp">
          <select
            id="sortOrders"
            value={sortBy}
            onChange={(event) => {
              setSortBy(event.target.value);
              setCurrentPage(0);
            }}
          >
            <option value="priority">Ưu tiên xử lý (mặc định)</option>
            <option value="id,desc">Mã đơn: Mới nhất trước</option>
            <option value="id,asc">Mã đơn: Cũ nhất trước</option>
            <option value="total,desc">Giá trị: Cao đến thấp</option>
            <option value="total,asc">Giá trị: Thấp đến cao</option>
          </select>
        </AdminFilterField>
      </AdminToolbar>

      {loading ? (
        <LoadingState text="Đang tải đơn hàng..." />
      ) : error ? (
        <ErrorState text={error}>
          <Button onClick={() => loadOrders(sortBy === 'priority' ? 0 : currentPage, sortBy)}>Thử lại</Button>
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
              {
                key: 'total',
                label: 'Tổng tiền',
                render: (row) => <strong style={{ color: '#e53e3e' }}>{formatCurrency(row.total)}</strong>,
              },
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
            rows={visibleOrders}
          />

          {visibleOrders.length > 0 && (
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
