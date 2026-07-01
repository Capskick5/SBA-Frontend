import { useEffect, useState } from 'react';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import { ErrorState, LoadingState } from '../../components/ui/State';
import { adminService } from '../../services/adminService';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadReviews = () => {
    setLoading(true);
    setError(null);
    adminService.getReviews()
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
    loadReviews();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this review?')) {
      try {
        await adminService.deleteReview(id);
        setReviews(reviews.filter(r => r.id !== id));
      } catch {
        alert('Failed to delete review.');
      }
    }
  };

  return (
    <section className="stack">
      <h1>Review Management</h1>
      <p className="muted">Review listing requires a backend admin list endpoint.</p>
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
            { key: 'userName', label: 'User' },
            { key: 'rating', label: 'Rating' },
            { key: 'comment', label: 'Content' },
            {
              key: 'action', label: 'Actions', render: (row) =>
                <Button onClick={() => handleDelete(row.id)}>Delete</Button>
            },
          ]}
          rows={reviews}
        />
      )}
    </section>
  );
}
