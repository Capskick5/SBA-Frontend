import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminPageHeader from '../../components/ui/AdminPageHeader';
import AdminPagination from '../../components/ui/AdminPagination';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import { ErrorState, LoadingState } from '../../components/ui/State';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { adminService } from '../../services/adminService';
import { Eye } from 'lucide-react';

const PAGE_SIZE = 10;

const REASON_LABELS = {
  BOOK_DEFECT: 'Sách bị lỗi',
  WRONG_BOOK: 'Giao sai sách',
  DAMAGED_IN_TRANSIT: 'Sách bị hư hỏng do vận chuyển',
};

const STATUS_TABS = [
  { id: 'ALL', label: 'Tất cả', statuses: [] },
  { id: 'PENDING_REVIEW', label: 'Chờ xử lý', statuses: ['UNDER_REVIEW'] },
  { id: 'IN_PROGRESS', label: 'Đang xử lý', statuses: ['PICKUP_PENDING', 'RETURN_RECEIVED', 'INSPECTING', 'REFUND_PROCESSING'] },
  { id: 'DONE', label: 'Hoàn tất', statuses: ['REFUND_COMPLETED', 'COMPLETED'] },
  { id: 'REJECTED', label: 'Từ chối', statuses: ['REJECTED'] },
];

const STATUS_META = {
  UNDER_REVIEW: { badgeClass: 'refund-requested', badgeLabel: 'ĐANG XEM XÉT' },
  REJECTED: { badgeClass: 'cancelled', badgeLabel: 'TỪ CHỐI' },
  PICKUP_PENDING: { badgeClass: 'refund-requested', badgeLabel: 'CHỜ NHẬN HÀNG' },
  RETURN_RECEIVED: { badgeClass: 'refund-requested', badgeLabel: 'ĐÃ NHẬN HÀNG' },
  INSPECTING: { badgeClass: 'refund-requested', badgeLabel: 'ĐANG KIỂM TRA' },
  REFUND_PROCESSING: { badgeClass: 'refund-requested', badgeLabel: 'ĐANG HOÀN TIỀN' },
  REFUND_COMPLETED: { badgeClass: 'refunded', badgeLabel: 'ĐÃ HOÀN TIỀN' },
  COMPLETED: { badgeClass: 'refunded', badgeLabel: 'HOÀN TẤT' },
};

export default function AdminRefundsPage() {
  const [refunds, setRefunds] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [filterTab, setFilterTab] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadRefunds = useCallback(() => {
    setLoading(true);
    setError(null);
    const tab = STATUS_TABS.find((t) => t.id === filterTab);
    adminService.getRefundRequests({
      page,
      size: PAGE_SIZE,
      sort: 'createdAt,desc',
      statuses: tab?.statuses?.length ? tab.statuses : undefined,
    })
      .then((result) => {
        setRefunds(result?.items || result?.content || []);
        setTotalItems(result?.totalItems ?? result?.totalElements ?? 0);
        setTotalPages(result?.totalPages ?? 0);
      })
      .catch((err) => {
        console.error('Failed to load refund requests:', err);
        setError('Không tải được danh sách yêu cầu trả hàng. Vui lòng thử lại.');
      })
      .finally(() => setLoading(false));
  }, [page, filterTab]);

  useEffect(() => {
    loadRefunds();
  }, [loadRefunds]);

  const columns = [
    { key: 'id', label: 'Mã yêu cầu' },
    { key: 'orderId', label: 'Đơn hàng', render: (row) => <strong>#{row.orderId}</strong> },
    { key: 'requestedAmount', label: 'Số tiền hoàn', render: (row) => <strong style={{ color: '#ef4444' }}>{formatCurrency(row.requestedAmount)}</strong> },
    { key: 'reason', label: 'Lý do', render: (row) => REASON_LABELS[row.reason] || row.reason },
    { key: 'createdAt', label: 'Ngày yêu cầu', render: (row) => formatDateTime(row.createdAt) },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (row) => (
        <span className={`status-badge ${STATUS_META[row.status]?.badgeClass || 'refund-requested'}`}>
          {STATUS_META[row.status]?.badgeLabel || row.status}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Thao tác',
      render: (row) => (
        <div className="admin-row-actions">
          <Link to={`/admin/refunds/${row.id}`} style={{ textDecoration: 'none' }}>
            <Button type="button" variant="secondary" size="sm">
              <Eye size={14} /> Chi tiết
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <section className="stack">
      <AdminPageHeader
        title="Yêu cầu hoàn hàng / hoàn tiền"
        subtitle={`${totalItems} yêu cầu · Duyệt và xử lý trả hàng / hoàn tiền từ khách.`}
      />

      <div className="admin-filter-tabs">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`admin-filter-tab ${filterTab === tab.id ? 'is-active' : ''}`}
            onClick={() => { setFilterTab(tab.id); setPage(0); }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState text="Đang tải yêu cầu trả hàng..." />
      ) : error ? (
        <ErrorState text={error}>
          <Button onClick={loadRefunds}>Thử lại</Button>
        </ErrorState>
      ) : (
        <>
          <Table columns={columns} rows={refunds} emptyText="Chưa có yêu cầu trả hàng nào." />
          {totalPages > 0 && (
            <AdminPagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </section>
  );
}
