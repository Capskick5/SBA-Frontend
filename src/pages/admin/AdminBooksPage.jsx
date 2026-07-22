import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import AdminPagination from '../../components/ui/AdminPagination';
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
        setError('Không thể tải kho sách.');
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
      alert(`Đã ${row.active ? 'ẩn' : 'hiển thị'} sách thành công.`);
      loadBooks(currentPage, sortBy, statusFilter, debouncedSearch);
    } catch (err) {
      alert('Không thể cập nhật trạng thái sách: ' + (err.response?.data?.message || err.message));
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
      <h1>Kho sách</h1>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', maxWidth: '500px', flex: '1 1 320px' }}>
          <div style={{ flex: 1 }}>
            <Input
              aria-label="Tìm kiếm sách"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Tiêu đề, tác giả hoặc ISBN"
              style={{ height: '46px' }}
            />
          </div>
          <Button
            type="button"
            variant="primary"
            onClick={() => navigate('/admin/books/new')}
            style={{ height: '46px', flexShrink: 0 }}
          >
            + Thêm sách
          </Button>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label htmlFor="statusSelect" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', margin: 0 }}>
            Trạng thái:
            <select
              id="statusSelect"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setCurrentPage(0);
              }}
              style={toolbarControlStyle}
            >
              <option value="all">Tất cả</option>
              <option value="active">Đang hiện</option>
              <option value="hidden">Đã ẩn</option>
            </select>
          </label>

          <label htmlFor="sortSelect" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', margin: 0 }}>
            Sắp xếp:
            <select
              id="sortSelect"
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value);
                setCurrentPage(0);
              }}
              style={toolbarControlStyle}
            >
              <option value="id,desc">ID: Mới nhất trước</option>
              <option value="id,asc">ID: Cũ nhất trước</option>
              <option value="price,asc">Giá: Thấp đến cao</option>
              <option value="price,desc">Giá: Cao đến thấp</option>
              <option value="soldCount,desc">Bán chạy nhất</option>
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <LoadingState text="Đang tải sách..." />
      ) : error ? (
        <ErrorState text={error}>
          <Button onClick={() => loadBooks(currentPage, sortBy, statusFilter, debouncedSearch)}>Thử lại</Button>
        </ErrorState>
      ) : (
        <>
          <Table
            emptyText="Không tìm thấy sách nào."
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'title', label: 'Tiêu đề' },
              { key: 'author', label: 'Tác giả' },
              {
                key: 'category',
                label: 'Danh mục',
                render: (row) => row.category?.name || <em style={{ color: '#999' }}>Chưa phân loại</em>,
              },
              { key: 'price', label: 'Giá', render: (row) => formatCurrency(row.price) },
              { key: 'stock', label: 'Tồn kho' },
              {
                key: 'active',
                label: 'Trạng thái',
                render: (row) => (
                  <span className={`status-badge ${row.active ? 'delivered' : 'unknown'}`}>
                    {row.active ? 'Đang hiện' : 'Đã ẩn'}
                  </span>
                ),
              },
              {
                key: 'action',
                label: 'Thao tác',
                render: (row) => (
                  <div className="admin-row-actions">
                    <Link
                      to={`/admin/books/${row.id}`}
                      state={{ book: row }}
                      className="btn btn-secondary btn-sm"
                    >
                      Sửa
                    </Link>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className={row.active ? 'danger-action' : ''}
                      onClick={() => handleToggleActive(row)}
                    >
                      {row.active ? 'Ẩn' : 'Hiện'}
                    </Button>
                  </div>
                ),
              },
            ]}
            rows={books}
          />

          {books.length > 0 && (
            <AdminPagination
              page={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}
    </section>
  );
}
