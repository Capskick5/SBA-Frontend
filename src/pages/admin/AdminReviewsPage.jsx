import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminPagination from '../../components/ui/AdminPagination';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Table from '../../components/ui/Table';
import { ErrorState, LoadingState } from '../../components/ui/State';
import { adminService } from '../../services/adminService';
import { formatDateTime } from '../../utils/formatters';
import { showToast } from '../../utils/toast';

const PAGE_SIZE = 10;

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [status, setStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [moderationTarget, setModerationTarget] = useState(null);
  const [moderationReason, setModerationReason] = useState('');
  const [moderating, setModerating] = useState(false);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [historyEntries, setHistoryEntries] = useState([]);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  const loadReviews = useCallback(() => {
    setLoading(true);
    setError(null);
    adminService.getReviews({
      page,
      size: PAGE_SIZE,
      sort: 'createdAt,desc',
      ...(status === 'ALL' ? {} : { status }),
    })
      .then((result) => {
        setReviews(result?.items || result?.content || []);
        setTotalItems(result?.totalItems ?? result?.totalElements ?? 0);
        setTotalPages(result?.totalPages ?? 0);
      })
      .catch((err) => {
        console.error('Failed to load reviews:', err);
        setError('Không thể tải đánh giá. Vui lòng thử lại sau.');
      })
      .finally(() => setLoading(false));
  }, [page, status]);

  useEffect(() => {
    Promise.resolve().then(loadReviews);
  }, [loadReviews]);

  const openModeration = (review) => {
    setModerationTarget(review);
    setModerationReason('');
  };

  const handleModeration = async () => {
    if (!moderationTarget || moderating) return;
    const nextStatus = moderationTarget.status === 'HIDDEN' ? 'PUBLISHED' : 'HIDDEN';
    if (nextStatus === 'HIDDEN' && !moderationReason.trim()) {
      showToast('Nhập lý do trước khi ẩn đánh giá này.', 'error');
      return;
    }

    setModerating(true);
    try {
      await adminService.moderateReview(moderationTarget.id, {
        status: nextStatus,
        reason: nextStatus === 'HIDDEN' ? moderationReason.trim() : undefined,
      });
      setModerationTarget(null);
      showToast(nextStatus === 'HIDDEN' ? 'Đã ẩn đánh giá thành công.' : 'Đã khôi phục đánh giá thành công.', 'success');
      if (reviews.length === 1 && page > 0) {
        setPage((current) => current - 1);
      } else {
        loadReviews();
      }
    } catch (err) {
      showToast(err?.response?.data?.message || err?.message || 'Không thể kiểm duyệt đánh giá.', 'error');
    } finally {
      setModerating(false);
    }
  };

  const openHistory = (review) => {
    setHistoryTarget(review);
    setHistoryEntries([]);
    setHistoryPage(0);
  };

  useEffect(() => {
    if (!historyTarget) return undefined;
    let active = true;
    Promise.resolve()
      .then(() => {
        if (active) {
          setHistoryLoading(true);
          setHistoryError('');
        }
        return adminService.getReviewModerationHistory(historyTarget.id, {
          page: historyPage,
          size: PAGE_SIZE,
          sort: 'createdAt,desc',
        });
      })
      .then((result) => {
        if (!active) return;
        setHistoryEntries(result?.items || result?.content || []);
        setHistoryTotalPages(result?.totalPages ?? 0);
      })
      .catch((err) => {
        console.error('Failed to load moderation history:', err);
        if (active) setHistoryError('Không thể tải lịch sử kiểm duyệt.');
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [historyPage, historyTarget]);

  return (
    <section className="stack admin-reviews-page">
      <div className="admin-review-heading">
        <div>
          <h1>Quản lý đánh giá</h1>
          <p className="muted">Theo dõi phản hồi từ mua hàng đã xác minh và ẩn nội dung không phù hợp mà không xóa bằng chứng.</p>
        </div>
        <span className="admin-review-count">{totalItems} đánh giá</span>
      </div>

      <div className="admin-review-filters">
        <label>
          <span>Trạng thái</span>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(0);
            }}
          >
            <option value="ALL">Tất cả đánh giá</option>
            <option value="PUBLISHED">Đang hiển thị</option>
            <option value="HIDDEN">Đã ẩn</option>
          </select>
        </label>
      </div>

      {loading ? (
        <LoadingState text="Đang tải đánh giá..." />
      ) : error ? (
        <ErrorState text={error}>
          <Button onClick={loadReviews}>Thử lại</Button>
        </ErrorState>
      ) : (
        <>
          <Table
            emptyText="Không tìm thấy đánh giá nào."
            columns={[
              {
                key: 'bookId',
                label: 'Sách',
                render: (row) => (
                  <Link className="admin-review-book" to={`/admin/books/${row.bookId}`}>
                    Sách #{row.bookId}
                  </Link>
                ),
              },
              { key: 'userName', label: 'Khách hàng' },
              {
                key: 'rating',
                label: 'Xếp hạng',
                render: (row) => (
                  <span className="admin-review-rating" aria-label={`${row.rating} trên 5 sao`}>
                    {'★'.repeat(row.rating)}{'☆'.repeat(5 - row.rating)}
                    <strong>{row.rating}/5</strong>
                  </span>
                ),
              },
              {
                key: 'comment',
                label: 'Đánh giá',
                render: (row) => row.comment || <span className="muted">Chỉ xếp hạng</span>,
              },
              {
                key: 'status',
                label: 'Trạng thái',
                render: (row) => (
                  <span className={`admin-review-status ${row.status === 'HIDDEN' ? 'is-hidden' : 'is-published'}`}>
                    {row.status === 'HIDDEN' ? 'Đã ẩn' : 'Đang hiển thị'}
                  </span>
                ),
              },
              {
                key: 'createdAt',
                label: 'Ngày gửi',
                render: (row) => formatDateTime(row.createdAt),
              },
              {
                key: 'action',
                label: 'Thao tác',
                render: (row) => (
                  <div className="admin-row-actions">
                    <Button type="button" variant="secondary" size="sm" onClick={() => openHistory(row)}>
                      Lịch sử
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => openModeration(row)}>
                      {row.status === 'HIDDEN' ? 'Khôi phục' : 'Ẩn'}
                    </Button>
                  </div>
                ),
              },
            ]}
            rows={reviews}
          />
          <AdminPagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}

      {moderationTarget && (
        <Modal
          title={moderationTarget.status === 'HIDDEN' ? 'Khôi phục đánh giá' : 'Ẩn đánh giá'}
          onClose={() => {
            if (!moderating) setModerationTarget(null);
          }}
        >
          <div className="admin-review-moderation-form">
            <p>
              {moderationTarget.status === 'HIDDEN'
                ? 'Khôi phục đánh giá này lên trang sách công khai?'
                : 'Đánh giá sẽ biến mất khỏi trang sách công khai nhưng vẫn khả dụng cho quản trị viên.'}
            </p>
            {moderationTarget.status !== 'HIDDEN' && (
              <label>
                <span>Lý do</span>
                <textarea
                  rows="4"
                  maxLength="500"
                  value={moderationReason}
                  onChange={(event) => setModerationReason(event.target.value)}
                  placeholder="Giải thích lý do ẩn đánh giá này"
                />
              </label>
            )}
            <div className="actions">
              <Button type="button" variant="secondary" onClick={() => setModerationTarget(null)} disabled={moderating}>
                Hủy
              </Button>
              <Button type="button" onClick={handleModeration} loading={moderating}>
                {moderationTarget.status === 'HIDDEN' ? 'Khôi phục đánh giá' : 'Ẩn đánh giá'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {historyTarget && (
        <Modal title={`Lịch sử kiểm duyệt · Đánh giá #${historyTarget.id}`} onClose={() => setHistoryTarget(null)}>
          {historyLoading ? (
            <LoadingState text="Đang tải lịch sử kiểm duyệt..." />
          ) : historyError ? (
            <ErrorState text={historyError} />
          ) : historyEntries.length === 0 ? (
            <p className="muted">Đánh giá này chưa được kiểm duyệt.</p>
          ) : (
            <>
              <ol className="admin-review-history">
                {historyEntries.map((entry) => (
                  <li key={entry.id}>
                    <div className="admin-review-history-heading">
                      <strong>{entry.fromStatus} → {entry.toStatus}</strong>
                      <time>{formatDateTime(entry.createdAt)}</time>
                    </div>
                    <p>Bởi {entry.moderatorName || `Admin #${entry.moderatedBy}`}</p>
                    {entry.reason && <p className="admin-review-history-reason">{entry.reason}</p>}
                  </li>
                ))}
              </ol>
              <AdminPagination
                page={historyPage}
                totalPages={historyTotalPages}
                onPageChange={setHistoryPage}
              />
            </>
          )}
        </Modal>
      )}
    </section>
  );
}
