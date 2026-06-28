import { useEffect, useState } from 'react';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import { adminService } from '../../services/adminService';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    adminService.getReviews().then(setReviews);
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
      <Table
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
    </section>
  );
}
