import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { ErrorState, LoadingState } from '../../components/ui/State';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(0);
  }, [debouncedSearch]);

  const loadBooks = useCallback((pageIndex, currentSort, currentStatus, query) => {
    setLoading(true);
    setError('');
    const params = { page: pageIndex, size: 10, sort: currentSort };
    if (query) {
      params.query = query;
    }
    if (currentStatus === 'active') {
      params.active = true;
    } else if (currentStatus === 'hidden') {
      params.active = false;
    }
    adminService.getBooksAdmin(params)
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
        setError('Could not load the book inventory.');
        setBooks([]);
        setTotalPages(1);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => loadBooks(currentPage, sortBy, statusFilter, debouncedSearch));
  }, [currentPage, sortBy, statusFilter, debouncedSearch, loadBooks]);

  const handleToggleActive = async (row) => {
    try {
      await adminService.toggleBookActive(row.id, !row.active);
      alert(`Book ${row.active ? 'hidden' : 'shown'} successfully.`);
      loadBooks(currentPage, sortBy, statusFilter, debouncedSearch);
    } catch (err) {
      alert('Failed to update book status: ' + (err.response?.data?.message || err.message));
    }
  };

  const toolbarControlStyle = {
    padding: '12px 16px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--text)',
    height: '46px',
    boxSizing: 'border-box',
  };

  return (
    <section className="stack">
      <h1>Book Inventory</h1>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', maxWidth: '500px', flex: '1 1 320px' }}>
          <div style={{ flex: 1 }}>
            <Input
              aria-label="Search books"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Title, author, or ISBN"
              style={{ height: '46px' }}
            />
          </div>
          <Button
            type="button"
            variant="primary"
            onClick={() => navigate('/admin/books/new')}
            style={{ height: '46px', flexShrink: 0 }}
          >
            + Add Book
          </Button>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label htmlFor="statusSelect" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', margin: 0 }}>
            Status:
            <select
              id="statusSelect"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setCurrentPage(0);
              }}
              style={toolbarControlStyle}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="hidden">Hidden</option>
            </select>
          </label>

          <label htmlFor="sortSelect" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', margin: 0 }}>
            Sort:
            <select
              id="sortSelect"
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value);
                setCurrentPage(0);
              }}
              style={toolbarControlStyle}
            >
              <option value="id,desc">ID: Newest first</option>
              <option value="id,asc">ID: Oldest first</option>
              <option value="price,asc">Price: Low to high</option>
              <option value="price,desc">Price: High to low</option>
              <option value="soldCount,desc">Best selling</option>
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <LoadingState text="Loading books..." />
      ) : error ? (
        <ErrorState text={error}>
          <Button onClick={() => loadBooks(currentPage, sortBy, statusFilter, debouncedSearch)}>Try again</Button>
        </ErrorState>
      ) : (
        <>
          <Table
            emptyText="No books found."
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
                    <Link
                      to={`/admin/books/${row.id}`}
                      state={{ book: row }}
                      className="btn-link"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(row)}
                      className="btn-link"
                      style={{ color: row.active ? '#e53e3e' : '#3182ce' }}
                    >
                      {row.active ? 'Hide' : 'Show'}
                    </button>
                  </div>
                ),
              },
            ]}
            rows={books}
          />

          {books.length > 0 && (
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
          )}
        </>
      )}
    </section>
  );
}
