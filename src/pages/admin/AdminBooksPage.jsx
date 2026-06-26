import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Table from '../../components/ui/Table';
import { adminService } from '../../services/adminService';
import { formatCurrency } from '../../utils/formatters';

export default function AdminBooksPage() {
  const [books, setBooks] = useState([]);

  useEffect(() => {
    // Gọi API thực tế từ adminService
    adminService.getBooks().then((data) => {
      // Backend thường trả về page object, nếu có thuộc tính 'content' thì dùng nó
      setBooks(data.content || data);
    });
  }, []);

  return (
    <section className="stack">
      <h1>Quản lý Sách</h1>
      <Table
        columns={[
          { key: 'title', label: 'Tên sách' },
          { key: 'author', label: 'Tác giả' },
          { key: 'price', label: 'Giá', render: (row) => formatCurrency(row.price) },
          { key: 'stock', label: 'Kho' },
          { key: 'action', label: 'Thao tác', render: (row) => <Link to={`/admin/books/${row.id}`}>Sửa</Link> },
        ]}
        rows={books}
      />
    </section>
  );
}