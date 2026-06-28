import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import { adminService } from '../../services/adminService';
import { formatCurrency } from '../../utils/formatters';

export default function AdminBooksPage() {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('id,desc');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadBooks = useCallback((pageIndex, currentSort, currentStatus) => {
    setLoading(true);
    const params = { page: pageIndex, size: 10, sort: currentSort };
    if (currentStatus === 'active') {
      params.active = true;
    } else if (currentStatus === 'hidden') {
      params.active = false;
    }
    adminService.getBooks(params)
      .then((res) => {
        const responseBody = res.data || res;

        if (responseBody?.data?.items && Array.isArray(responseBody.data.items)) {
          setBooks(responseBody.data.items);
          setTotalPages(responseBody.data.totalPages || 1);
        } else if (responseBody?.items && Array.isArray(responseBody.items)) {
          setBooks(responseBody.items);
          setTotalPages(responseBody.totalPages || 1);
        } else {
          setBooks([]);
          setTotalPages(1);
        }
      })
      .catch((err) => {
        console.error('Failed to load books:', err);
        setBooks([]);
        setTotalPages(1);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => loadBooks(currentPage, sortBy, statusFilter));
  }, [currentPage, sortBy, statusFilter, loadBooks]);

  const handleToggleActive = async (row) => {
    try {
      await adminService.toggleBookActive(row.id, !row.active);
      alert(`Book ${row.active ? 'hidden' : 'shown'} successfully.`);
      loadBooks(currentPage, sortBy, statusFilter);
    } catch (err) {
      alert('Failed to update book status: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <section className="stack">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Book Inventory</h1>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Button variant="primary" onClick={() => navigate('/admin/books/new')}>
            + Add Book
          </Button>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div>
              <label htmlFor="statusSelect" style={{ marginRight: '8px', fontWeight: 'bold' }}>Status:</label>
              <select
                id="statusSelect"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setCurrentPage(0);
                }}
                style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>

            <div>
              <label htmlFor="sortSelect" style={{ marginRight: '8px', fontWeight: 'bold' }}>Sort:</label>
              <select
                id="sortSelect"
                value={sortBy}
                onChange={(event) => {
                  setSortBy(event.target.value);
                  setCurrentPage(0);
                }}
                style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                <option value="id,desc">ID: Newest first</option>
                <option value="id,asc">ID: Oldest first</option>
                <option value="price,asc">Price: Low to high</option>
                <option value="price,desc">Price: High to low</option>
                <option value="soldCount,desc">Best selling</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <p>Loading books...</p>
      ) : (
        <>
          <Table
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'title', label: 'Title' },
              { key: 'author', label: 'Author' },
              {
                key: 'category',
                label: 'Category',
                render: (row) => row.category?.name || <em style={{ color: '#999' }}>Uncategorized</em>,
              },
              { key: 'price', label: 'Price', render: (row) => formatCurrency(row.price) },
              { key: 'stock', label: 'Stock' },
              {
                key: 'active',
                label: 'Status',
                render: (row) => (
                  <span style={{ color: row.active ? 'green' : 'red', fontWeight: 'bold' }}>
                    {row.active ? 'Active' : 'Hidden'}
                  </span>
                ),
              },
              {
                key: 'action',
                label: 'Actions',
                render: (row) => (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Link to={`/admin/books/${row.id}`} className="btn-link">Edit</Link>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(row)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: row.active ? '#e53e3e' : '#3182ce',
                        cursor: 'pointer',
                        padding: 0,
                        textDecoration: 'underline',
                      }}
                    >
                      {row.active ? 'Hide' : 'Show'}
                    </button>
                  </div>
                ),
              },
            ]}
            rows={books}
          />

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '20px' }}>
            <Button type="button" disabled={currentPage === 0} onClick={() => setCurrentPage((prev) => prev - 1)}>
              &laquo; Previous
            </Button>
            <span style={{ fontWeight: 'bold' }}>
              Page {currentPage + 1} / {totalPages}
            </span>
            <Button type="button" disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage((prev) => prev + 1)}>
              Next &raquo;
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
