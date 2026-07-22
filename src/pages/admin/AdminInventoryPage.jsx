import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import Button from '../../components/ui/Button';
import AdminPageHeader from '../../components/ui/AdminPageHeader';
import AdminToolbar, { AdminFilterField } from '../../components/ui/AdminToolbar';
import AdminPagination from '../../components/ui/AdminPagination';
import Table from '../../components/ui/Table';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/State';
import { formatDateTime } from '../../utils/formatters';

export default function AdminInventoryPage() {
  const getQuantity = (mov) => {
    return mov.delta ?? mov.quantityDelta ?? mov.change ?? mov.quantity ?? mov.amount ?? mov.quantityChange ?? 0;
  };

  const REASON_LABELS = {
    ADMIN_IMPORT: 'Nhập kho',
    ADMIN_ADJUSTMENT: 'Điều chỉnh thủ công',
    ORDER_HOLD: 'Giữ hàng đơn',
    ORDER_CANCEL_RELEASE: 'Hoàn kho khi hủy đơn',
    ORDER_EXPIRED_RELEASE: 'Hoàn kho khi hết hạn đơn',
  };

  const NOTE_LABELS = {
    'Stock held for checkout': 'Giữ tồn kho khi thanh toán',
    'Stock released after customer cancellation': 'Hoàn tồn kho sau khi khách hủy đơn',
    'Stock released after order expiry': 'Hoàn tồn kho sau khi đơn hết hạn',
    'Stock released after payment cancellation': 'Hoàn tồn kho sau khi hủy thanh toán',
  };

  const formatReason = (reason) => {
    if (!reason) return 'Không xác định';
    const key = String(reason).toUpperCase();
    return REASON_LABELS[key] || reason
      .toLowerCase()
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatNote = (note) => {
    if (!note) return '';
    return NOTE_LABELS[note] || note;
  };

  const [movements, setMovements] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const PAGE_SIZE = 10;

  useEffect(() => {
    let active = true;
    const fetchMovements = async () => {
      setLoading(true);
      setError(null);
      try {
        const [movementsRes, usersRes] = await Promise.all([
          adminService.getStockMovements({ page: 0, size: 200, sort: 'createdAt,desc' }),
          adminService.getUsers({ limit: 1000 })
        ]);

        if (!active) return;

        const data = movementsRes.data?.items || movementsRes.data || [];
        const sortedMovements = Array.isArray(data)
          ? [...data].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          : [];
        setMovements(sortedMovements);

        const usersList = usersRes.data?.items || usersRes.data || [];
        const map = {};
        if (Array.isArray(usersList)) {
          usersList.forEach(u => {
            map[u.id] = u.name || u.email || `User ${u.id}`;
          });
        }
        setUsersMap(map);
      } catch (err) {
        if (!active) return;
        console.error('Failed to load stock movements', err);
        setError(err.response?.data?.message || err.message);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchMovements();
    return () => { active = false; };
  }, [reloadKey]);

  if (loading) return <LoadingState text="Đang tải nhật ký kho..." />;
  if (error) {
    return (
      <ErrorState text={`Không thể tải nhật ký kho. ${error}`}>
        <Button type="button" onClick={() => setReloadKey((value) => value + 1)}>Thử lại</Button>
      </ErrorState>
    );
  }

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(0);
  };

  const filteredMovements = movements.filter((mov) => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();

    const bookTitle = (mov.book?.title || '').toLowerCase();
    const bookId = String(mov.bookId || '');
    const reason = (mov.reason || '').toLowerCase();
    const reasonLabel = formatReason(mov.reason).toLowerCase();
    const note = formatNote(mov.note || '').toLowerCase();
    const orderId = String(mov.orderId || '');
    const creator = (mov.createdByName || usersMap[mov.createdBy] || String(mov.createdBy) || '').toLowerCase();
    const quantity = String(getQuantity(mov));

    return bookTitle.includes(lowerQuery) ||
      bookId.includes(lowerQuery) ||
      note.includes(lowerQuery) ||
      reason.includes(lowerQuery) ||
      reasonLabel.includes(lowerQuery) ||
      orderId.includes(lowerQuery) ||
      creator.includes(lowerQuery) ||
      quantity.includes(lowerQuery);
  });

  const paginatedMovements = filteredMovements.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filteredMovements.length / PAGE_SIZE) || 1;

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'bookId', label: 'Mã sách' },
    {
      key: 'reason',
      label: 'Lý do',
      render: (mov) => (
        <span className={`inventory-reason inventory-reason-${(mov.reason || 'unknown').toLowerCase()}`}>
          {formatReason(mov.reason)}
        </span>
      ),
    },
    {
      key: 'orderId',
      label: 'Mã đơn',
      render: (mov) => (
        mov.orderId
          ? <Link className="inventory-order-link" to={`/admin/orders/${mov.orderId}`}>#{mov.orderId}</Link>
          : <span className="muted">Thủ công</span>
      ),
    },
    {
      key: 'quantity',
      label: 'Thay đổi số lượng',
      render: (mov) => {
        const q = getQuantity(mov);
        return (
          <span className={`inventory-delta ${q > 0 ? 'inventory-delta-positive' : q < 0 ? 'inventory-delta-negative' : ''}`}>
            {q > 0 ? `+${q}` : q}
          </span>
        );
      },
    },
    {
      key: 'note',
      label: 'Ghi chú',
      render: (mov) => formatNote(mov.note),
    },
    {
      key: 'createdBy',
      label: 'Người tạo',
      render: (mov) => mov.createdByName || usersMap[mov.createdBy] || mov.createdBy || 'Hệ thống',
    },
    {
      key: 'createdAt',
      label: 'Ngày',
      render: (mov) => formatDateTime(mov.createdAt),
    },
  ];

  return (
    <section>
      <AdminPageHeader
        title="Quản lý kho"
        subtitle="Nhật ký toàn cục mọi biến động tồn kho sách."
      />

      <AdminToolbar>
        <AdminFilterField label="Tìm kiếm">
          <input
            type="text"
            placeholder="Tìm kiếm nhật ký (sách, ghi chú, người dùng...)"
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </AdminFilterField>
      </AdminToolbar>

      {movements.length === 0 ? (
        <EmptyState title="Chưa có hoạt động kho" text="Thay đổi tồn kho sẽ hiển thị tại đây sau đơn hàng hoặc điều chỉnh thủ công." />
      ) : (
        <>
          <Table
            columns={columns}
            rows={paginatedMovements}
            emptyText={searchQuery ? `Không tìm thấy kết quả cho "${searchQuery}"` : 'Không có dữ liệu.'}
          />
          {filteredMovements.length > 0 && (
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
