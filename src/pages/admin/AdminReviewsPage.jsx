import { useEffect, useState } from 'react';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Table from '../../components/ui/Table';
import { adminService } from '../../services/adminService';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [selectedReview, setSelectedReview] = useState(null);
  useEffect(() => { adminService.getReviews().then(setReviews); }, []);
  return (
    <section className="stack">
      <h1>Manage Reviews</h1>
      <Table
        columns={[
          { key: 'userName', label: 'User' },
          { key: 'rating', label: 'Rating' },
          { key: 'comment', label: 'Comment', render: (row) => `${row.comment.slice(0, 56)}...` },
          {
            key: 'action',
            label: 'Action',
            render: (row) => (
              <div className="actions">
                <Button onClick={() => setSelectedReview(row)}>View</Button>
                <Button>Delete</Button>
              </div>
            ),
          },
        ]}
        rows={reviews}
      />
      {selectedReview && (
        <Modal title="Review Detail" onClose={() => setSelectedReview(null)}>
          <div className="stack">
            <p><strong>User:</strong> {selectedReview.userName}</p>
            <p><strong>Rating:</strong> {selectedReview.rating}/5</p>
            <p>{selectedReview.comment}</p>
            <Button onClick={() => setSelectedReview(null)}>Close</Button>
          </div>
        </Modal>
      )}
    </section>
  );
}
