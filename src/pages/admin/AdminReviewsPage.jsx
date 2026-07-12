import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Table from '../../components/ui/Table';
import { ErrorState, LoadingState } from '../../components/ui/State';
import { adminService } from '../../services/adminService';
import { formatDateTime } from '../../utils/formatters';
import { showToast } from '../../utils/toast';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadReviews = () => {
    setLoading(true);
    setError(null);
    adminService.getReviews({ page: 0, size: 50, sort: 'createdAt,desc' })
      .then((res) => {
        const data = res.data || res;
        setReviews(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error('Failed to load reviews:', err);
        setError('Failed to load reviews. Please try again later.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    Promise.resolve().then(loadReviews);
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await adminService.deleteReview(deleteTarget.id);
      setReviews((current) => current.filter((review) => review.id !== deleteTarget.id));
      setDeleteTarget(null);
      showToast('Review deleted successfully.', 'success');
    } catch (err) {
      showToast(err?.message || 'Failed to delete review.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="stack">
      <div className="admin-review-heading">
        <div>
          <h1>Review Management</h1>
          <p className="muted">Monitor verified-purchase feedback and remove inappropriate content.</p>
        </div>
        <span className="admin-review-count">{reviews.length} reviews</span>
      </div>
      {loading ? (
        <LoadingState text="Loading reviews..." />
      ) : error ? (
        <ErrorState text={error}>
          <Button onClick={loadReviews}>Retry</Button>
        </ErrorState>
      ) : (
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
              key: 'createdAt',
              label: 'Submitted',
              render: (row) => formatDateTime(row.createdAt),
            },
            {
              key: 'action', label: 'Actions', render: (row) =>
                <Button className="admin-review-delete" onClick={() => setDeleteTarget(row)}>Delete</Button>
            },
          ]}
          rows={reviews}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete this review?"
          onCancel={() => {
            if (!deleting) setDeleteTarget(null);
          }}
          onConfirm={handleDelete}
        >
          This removes {deleteTarget.userName || 'the customer'}&apos;s review from Book #{deleteTarget.bookId} and recalculates the book rating.
        </ConfirmDialog>
      )}
    </section>
  );
}
