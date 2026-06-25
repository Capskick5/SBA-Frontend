import { useEffect, useState } from 'react';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import { adminService } from '../../services/adminService';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);
  useEffect(() => { adminService.getReviews().then(setReviews); }, []);
  return (
    <section className="stack">
      <h1>Manage Reviews</h1>
      <Table
        columns={[
          { key: 'userName', label: 'User' },
          { key: 'rating', label: 'Rating' },
          { key: 'comment', label: 'Comment' },
          { key: 'action', label: 'Action', render: () => <Button>Delete</Button> },
        ]}
        rows={reviews}
      />
    </section>
  );
}
