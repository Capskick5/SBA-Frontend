import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import { adminService } from '../../services/adminService';
import { formatCurrency } from '../../utils/formatters';

export default function AdminBooksPage() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('id,desc');

  const loadBooks = (pageIndex, currentSort) => {
    adminService.getBooks({ page: pageIndex, size: 10, sort: currentSort })
      .then((page) => {
        setBooks(page.items || []);
        setTotalPages(page.totalPages || 1);
      })
      .catch((err) => {
        console.error('Lỗi lấy danh sách sách:', err);
        setBooks([]);
        setTotalPages(1);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBooks(currentPage, sortBy);
  }, [currentPage, sortBy]);

  const handleToggleActive = async (book) => {
    try {
      await adminService.toggleBookActive(book.id, !book.active);
      loadBooks(currentPage, sortBy);
    } catch (err) {
      alert(`Không thể cập nhật trạng thái sản phẩm: ${err.message}`);
    }
  };

  return (
    <section className="stack">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Quản lý kho sách</h1>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div>
            <label htmlFor="sortSelect" style={{ marginRight: '8px', fontWeight: 'bold' }}>Sắp xếp:</label>
            <select
              id="sortSelect"
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value);
                setCurrentPage(0);
              }}
              style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="id,desc">ID: Mới nhất</option>
              <option value="id,asc">ID: Cũ nhất</option>
              <option value="price,asc">Giá: Thấp đến cao</option>
              <option value="price,desc">Giá: Cao xuống thấp</option>
              <option value="soldCount,desc">Bán chạy nhất</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <p>Đang tải danh sách sách từ hệ thống...</p>
      ) : (
        <>
          <Table
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'title', label: 'Tên sách' },
              { key: 'author', label: 'Tác giả' },
              {
                key: 'category',
                label: 'Danh mục',
                render: (row) => row.category?.name || <em style={{ color: '#999' }}>Chưa phân loại</em>,
              },
              { key: 'price', label: 'Giá bán', render: (row) => formatCurrency(row.price) },
              { key: 'stock', label: 'Kho còn' },
              {
                key: 'active',
                label: 'Trạng thái',
                render: (row) => (
                  <span style={{ color: row.active ? 'green' : 'red', fontWeight: 'bold' }}>
                    {row.active ? 'Đang bán' : 'Đã ẩn'}
                  </span>
                ),
              },
              {
                key: 'action',
                label: 'Thao tác',
                render: (row) => (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Link to={`/admin/books/${row.id}`} className="btn-link">Sửa</Link>
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
                      {row.active ? 'Ẩn sách' : 'Hiện sách'}
                    </button>
                  </div>
                ),
              },
            ]}
            rows={books}
          />

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '20px' }}>
            <Button type="button" disabled={currentPage === 0} onClick={() => setCurrentPage((prev) => prev - 1)}>
              &laquo; Trang trước
            </Button>
            <span style={{ fontWeight: 'bold' }}>
              Trang {currentPage + 1} / {totalPages}
            </span>
            <Button type="button" disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage((prev) => prev + 1)}>
              Trang sau &raquo;
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
