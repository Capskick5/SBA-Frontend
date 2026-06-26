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
    if (window.confirm("Bạn có chắc chắn muốn xóa đánh giá này?")) {
      try {
        await adminService.deleteReview(id); // Giả định service này tồn tại
        setReviews(reviews.filter(r => r.id !== id));
      } catch (err) {
        alert("Lỗi khi xóa đánh giá");
      }
    }
  };

  return (
    <section className="stack">
      <h1>Quản lý Đánh giá</h1>
      <Table
        columns={[
          { key: 'userName', label: 'Người dùng' },
          { key: 'rating', label: 'Đánh giá' },
          { key: 'comment', label: 'Nội dung' },
          {
            key: 'action', label: 'Hành động', render: (row) =>
              <Button onClick={() => handleDelete(row.id)}>Xóa</Button>
          },
        ]}
        rows={reviews}
      />
    </section>
  );
}