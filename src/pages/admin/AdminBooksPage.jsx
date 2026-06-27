import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import { adminService } from '../../services/adminService';
import { bookService } from '../../services/bookService'; // SỬA LỖI 1: Import bookService
import { formatCurrency } from '../../utils/formatters';

export default function AdminBooksPage() {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('id,desc');

  // SỬA LỖI 2: Đồng bộ cấu trúc dữ liệu JSON sâu mới .data.items vào hàm load chung
  const loadBooks = (pageIndex, currentSort) => {
    setLoading(true);
    // Sử dụng api của adminService có kèm phân trang, kích thước mảng và sắp xếp
    adminService.getBooks({ page: pageIndex, size: 10, sort: currentSort })
      .then((res) => {
        const responseBody = res.data || res;

        // Bóc tách mảng từ data.items
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
        console.error('Lỗi lấy danh sách sách:', err);
        setBooks([]);
        setTotalPages(1);
      })
      .finally(() => setLoading(false));
  };

  // Kích hoạt load dữ liệu mỗi khi thay đổi số trang hoặc kiểu sắp xếp
  useEffect(() => {
    loadBooks(currentPage, sortBy);
  }, [currentPage, sortBy]);

  // SỬA LỖI 3: Định nghĩa hàm kích hoạt/ẩn trạng thái hoạt động của sách (Admin)
  const handleToggleActive = async (row) => {
    try {
      // Gọi API PUT /api/v1/books/{id}/active từ danh sách của bạn
      await adminService.toggleBookActive(row.id, !row.active);
      alert(`${row.active ? 'Ẩn' : 'Hiện'} sách thành công!`);
      loadBooks(currentPage, sortBy); // Tải lại danh sách cập nhật mới
    } catch (err) {
      alert('Lỗi thay đổi trạng thái sách: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <section className="stack">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Quản lý kho sách</h1>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {/* SỬA LỖI 4: Thêm lại nút Thêm sách mới trỏ đúng đường dẫn /new */}
          <Button variant="primary" onClick={() => navigate('/admin/books/new')}>
            + Thêm sách mới
          </Button>

          <div>
            <label htmlFor="sortSelect" style={{ marginRight: '8px', fontWeight: 'bold' }}>Sắp xếp:</label>
            <select
              id="sortSelect"
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value);
                setCurrentPage(0); // Reset về trang đầu khi đổi kiểu xếp
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

          {/* Thanh phân trang dữ liệu */}
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