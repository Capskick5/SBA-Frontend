import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Table from '../../components/ui/Table';
import { adminService } from '../../services/adminService';
import { formatCurrency } from '../../utils/formatters';

export default function AdminBooksPage() {
  const [books, setBooks] = useState([]);
  useEffect(() => { adminService.getBooks().then(setBooks); }, []);
  return (
    <section className="stack">
      <h1>Manage Books</h1>
      <Table
        columns={[
          { key: 'title', label: 'Title' },
          { key: 'author', label: 'Author' },
          { key: 'price', label: 'Price', render: (row) => formatCurrency(row.price) },
          { key: 'stock', label: 'Stock' },
          { key: 'action', label: 'Action', render: (row) => <Link to={`/admin/books/${row.id}`}>Edit</Link> },
        ]}
        rows={books}
      />
    </section>
  );
}
