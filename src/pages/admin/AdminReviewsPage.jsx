import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Pagination from '../../components/catalog/Pagination';
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
        setError('Failed to load reviews. Please try again later.');
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
      showToast('Enter a reason before hiding this review.', 'error');
      return;
    }

    setModerating(true);
    try {
      await adminService.moderateReview(moderationTarget.id, {
        status: nextStatus,
        reason: nextStatus === 'HIDDEN' ? moderationReason.trim() : undefined,
      });
      setModerationTarget(null);
      showToast(nextStatus === 'HIDDEN' ? 'Review hidden successfully.' : 'Review restored successfully.', 'success');
      if (reviews.length === 1 && page > 0) {
        setPage((current) => current - 1);
      } else {
        loadReviews();
      }
    } catch (err) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to moderate review.', 'error');
    } finally {
      setModerating(false);
    }
  };

  return (
    <section className="stack">
      <div className="admin-review-heading">
        <div>
          <h1>Review Management</h1>
          <p className="muted">Monitor verified-purchase feedback and hide inappropriate content without deleting evidence.</p>
        </div>
        <span className="admin-review-count">{totalItems} reviews</span>
      </div>

      <div className="admin-review-filters">
        <label>
          <span>Status</span>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(0);
            }}
          >
            <option value="ALL">All reviews</option>
            <option value="PUBLISHED">Published</option>
            <option value="HIDDEN">Hidden</option>
          </select>
        </label>
      </div>

      {loading ? (
        <LoadingState text="Loading reviews..." />
      ) : error ? (
        <ErrorState text={error}>
          <Button onClick={loadReviews}>Retry</Button>
        </ErrorState>
      ) : (
        <>
          <Table
            emptyText="No reviews found."
            columns={[
              {
                key: 'bookId',
                label: 'Book',
                render: (row) => <Link to={`/admin/books/${row.bookId}`}>Book #{row.bookId}</Link>,
              },
              { key: 'userName', label: 'Customer' },
              {
                key: 'rating',
                label: 'Rating',
                render: (row) => (
                  <span className="admin-review-rating" aria-label={`${row.rating} out of 5 stars`}>
                    {'★'.repeat(row.rating)}{'☆'.repeat(5 - row.rating)}
                    <strong>{row.rating}/5</strong>
                  </span>
                ),
              },
              {
                key: 'comment',
                label: 'Review',
                render: (row) => row.comment || <span className="muted">Rating only</span>,
              },
              {
                key: 'status',
                label: 'Status',
                render: (row) => (
                  <span className={`admin-review-status ${row.status === 'HIDDEN' ? 'is-hidden' : 'is-published'}`}>
                    {row.status === 'HIDDEN' ? 'Hidden' : 'Published'}
                  </span>
                ),
              },
              {
                key: 'createdAt',
                label: 'Submitted',
                render: (row) => formatDateTime(row.createdAt),
              },
              {
                key: 'action',
                label: 'Actions',
                render: (row) => (
                  <Button className="btn-secondary" onClick={() => openModeration(row)}>
                    {row.status === 'HIDDEN' ? 'Restore' : 'Hide'}
                  </Button>
                ),
              },
            ]}
            rows={reviews}
          />
          <Pagination
            currentPage={page + 1}
            totalPages={totalPages}
            onPageChange={(nextPage) => setPage(nextPage - 1)}
          />
        </>
      )}

      {moderationTarget && (
        <Modal
          title={moderationTarget.status === 'HIDDEN' ? 'Restore review' : 'Hide review'}
          onClose={() => {
            if (!moderating) setModerationTarget(null);
          }}
        >
          <div className="admin-review-moderation-form">
            <p>
              {moderationTarget.status === 'HIDDEN'
                ? 'Restore this review to the public book page?'
                : 'The review will disappear from the public book page but remain available to administrators.'}
            </p>
            {moderationTarget.status !== 'HIDDEN' && (
              <label>
                <span>Reason</span>
                <textarea
                  rows="4"
                  maxLength="500"
                  value={moderationReason}
                  onChange={(event) => setModerationReason(event.target.value)}
                  placeholder="Explain why this review should be hidden"
                />
              </label>
            )}
            <div className="actions">
              <Button className="btn-secondary" onClick={() => setModerationTarget(null)} disabled={moderating}>
                Cancel
              </Button>
              <Button onClick={handleModeration} loading={moderating}>
                {moderationTarget.status === 'HIDDEN' ? 'Restore review' : 'Hide review'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
