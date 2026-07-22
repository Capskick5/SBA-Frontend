import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import Button from '../../components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/State';
import { formatDateTime } from '../../utils/formatters';

export default function AdminInventoryPage() {
  const getQuantity = (mov) => {
    return mov.delta ?? mov.quantityDelta ?? mov.change ?? mov.quantity ?? mov.amount ?? mov.quantityChange ?? 0;
  };

  const formatReason = (reason) => {
    if (!reason) return 'Không xác định';
    return reason
      .toLowerCase()
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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
    const note = (mov.note || '').toLowerCase();
    const reason = (mov.reason || '').toLowerCase();
    const orderId = String(mov.orderId || '');
    const creator = (mov.createdByName || usersMap[mov.createdBy] || String(mov.createdBy) || '').toLowerCase();
    const quantity = String(getQuantity(mov));

    return bookTitle.includes(lowerQuery) ||
      bookId.includes(lowerQuery) ||
      note.includes(lowerQuery) ||
      reason.includes(lowerQuery) ||
      orderId.includes(lowerQuery) ||
      creator.includes(lowerQuery) ||
      quantity.includes(lowerQuery);
  });

  const paginatedMovements = filteredMovements.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filteredMovements.length / PAGE_SIZE) || 1;

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
        <div>
          <h1>Quản lý kho</h1>
          <p style={{ color: '#666', marginTop: '8px' }}>Nhật ký toàn cục mọi biến động tồn kho sách.</p>
        </div>
        <div style={{ width: '300px' }}>
          <input
            type="text"
            placeholder="Tìm kiếm nhật ký (sách, ghi chú, người dùng...)"
            value={searchQuery}
            onChange={handleSearchChange}
            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>
      </div>

      {movements.length === 0 ? (
        <EmptyState title="Chưa có hoạt động kho" text="Thay đổi tồn kho sẽ hiển thị tại đây sau đơn hàng hoặc điều chỉnh thủ công." />
      ) : (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Mã sách</th>
                <th>Lý do</th>
                <th>Mã đơn</th>
                <th>Thay đổi số lượng</th>
                <th>Ghi chú</th>
                <th>Người tạo</th>
                <th>Ngày</th>
              </tr>
            </thead>
            <tbody>
              {paginatedMovements.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>Không tìm thấy kết quả cho &quot;{searchQuery}&quot;</td></tr>
              ) : (
                paginatedMovements.map((mov) => (
                  <tr key={mov.id}>
                    <td>{mov.id}</td>
                    <td>{mov.bookId}</td>
                    <td><span className={`inventory-reason inventory-reason-${(mov.reason || 'unknown').toLowerCase()}`}>{formatReason(mov.reason)}</span></td>
                    <td>
                      {mov.orderId
                        ? <Link className="inventory-order-link" to={`/admin/orders/${mov.orderId}`}>#{mov.orderId}</Link>
                        : <span className="muted">Thủ công</span>}
                    </td>
                    <td>
                      {(() => {
                        const q = getQuantity(mov);
                        return (
                          <span className={`inventory-delta ${q > 0 ? 'inventory-delta-positive' : q < 0 ? 'inventory-delta-negative' : ''}`}>
                            {q > 0 ? `+${q}` : q}
                          </span>
                        );
                      })()}
                    </td>
                    <td>{mov.note}</td>
                    <td>{mov.createdByName || usersMap[mov.createdBy] || mov.createdBy || 'Hệ thống'}</td>
                    <td>{formatDateTime(mov.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {filteredMovements.length > 0 && (
            <div className="pagination" style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
              <Button
                type="button"
                className="btn-secondary"
                disabled={currentPage === 0}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Trước
              </Button>
              <span>Trang {currentPage + 1} / {totalPages}</span>
              <Button
                type="button"
                className="btn-secondary"
                disabled={currentPage >= totalPages - 1}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Sau
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
